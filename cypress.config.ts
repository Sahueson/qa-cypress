import { defineConfig } from "cypress";
import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import * as jpeg from "jpeg-js";

// Cypress contra Tactical Calendar (staging). Mismos casos y nombres que qa-playwright y
// qa-selenium. Una carpeta por suite: cypress/e2e/<suite>/*.cy.ts.
//
// Lo que sale de aquí a la web es result.json (formato común del lab) con una captura JPEG por
// test. Nunca vídeos ni logs: podrían llevar la contraseña QA.

const SHARED = path.resolve(__dirname, "shared");
const EVIDENCE_DIR = path.resolve(__dirname, "evidence");

type TestResult = {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration_ms: number;
  role: string | null;
  error: string | null;
  evidence_path: string | null;
};

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const redact = (s: string) => {
  const pwd = process.env.QA_PASSWORD;
  return pwd ? s.split(pwd).join("***") : s;
};

export default defineConfig({
  video: false,
  screenshotOnRunFailure: false, // la captura la hace afterEach, pase o falle
  screenshotsFolder: "cypress/screenshots",
  viewportWidth: 1280, // mismo viewport que Playwright, para comparar capturas
  viewportHeight: 720,
  defaultCommandTimeout: 10_000,
  retries: 0, // los tests mutan el staging
  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    // Secretos (cy.env en los tests) y valores públicos (Cypress.expose).
    env: {
      QA_PASSWORD: process.env.QA_PASSWORD,
    },
    expose: {
      grep: process.env.GREP ?? "",
    },
    setupNodeEvents(on) {
      const startedAt = new Date();
      const roles = new Map<string, string>();
      const evidence = new Map<string, string>();
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

      on("task", {
        /** Usuarios QA: la fuente única es users.json de ivan-qa-lab-shared. */
        qaUsers() {
          return JSON.parse(fs.readFileSync(path.join(SHARED, "reset-staging/users.json"), "utf8"));
        },
        /** Vuelve a dejar el staging como el seed. La reserva la tiene with-staging.js (QA_LOCK_HELD=1). */
        async resetStaging() {
          if (!process.env.STG_URL) return null;
          const { reset } = require(path.join(SHARED, "reset-staging/reset.js"));
          await reset({ log: () => {} });
          return null;
        },
        /** Rol con el que corre el test (columna "role" de la web): el primer usuario que entra. */
        setRole({ test, role }: { test: string; role: string }) {
          if (!roles.has(test)) roles.set(test, role);
          return null;
        },
      });

      // Cypress guarda PNG; se convierte a JPEG (calidad 60) como en las demás herramientas.
      on("after:screenshot", (details) => {
        const png = PNG.sync.read(fs.readFileSync(details.path));
        const jpg = jpeg.encode({ data: png.data, width: png.width, height: png.height }, 60);
        const file = path.join(EVIDENCE_DIR, `${slug(details.name ?? path.basename(details.path))}.jpg`);
        fs.writeFileSync(file, jpg.data);
        evidence.set(details.name ?? "", path.relative(__dirname, file));
        return { path: details.path };
      });

      on("after:run", (results: any) => {
        if (!results || !("runs" in results)) return;
        // Con filtro (GREP), los tests omitidos no son parte de la ejecución: no se publican.
        const filtered = !!process.env.GREP;
        const tests: TestResult[] = results.runs.flatMap((run: any) =>
          run.tests.filter((t: any) => !(filtered && t.state === "pending")).map((t: any): TestResult => {
            const name: string = t.title[t.title.length - 1];
            const status = t.state === "passed" ? "passed" : t.state === "failed" ? "failed" : "skipped";
            const duration = (t.attempts ?? []).reduce((acc: number, a: any) => acc + (a.wallClockDuration ?? a.duration ?? 0), 0)
              || t.duration || 0;
            return {
              name,
              status,
              duration_ms: Math.round(duration),
              role: roles.get(name) ?? null,
              error: status === "failed" && t.displayError ? redact(String(t.displayError).split("\n")[0]) : null,
              evidence_path: evidence.get(slug(name)) ?? null,
            };
          }),
        );
        const finishedAt = new Date();
        const count = (s: TestResult["status"]) => tests.filter((t) => t.status === s).length;
        fs.writeFileSync(path.join(__dirname, "result.json"), JSON.stringify({
          tool: "cypress",
          target: "tactical-calendar",
          suite: process.env.SUITE ?? "local",
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          summary: { total: tests.length, passed: count("passed"), failed: count("failed"), skipped: count("skipped") },
          tests,
        }, null, 2));
      });
    },
  },
});
