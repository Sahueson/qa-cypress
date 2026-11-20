// Comandos comunes de los tests de Cypress (equivalentes al page object de qa-playwright).
// La app solo tiene data-testid en el login QA; el resto se localiza por texto visible.

type QaUser = { key: string; email: string; nickname: string };

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Texto visible exacto (sin espacios sobrantes), para cy.contains. */
export const exactly = (text: string) => new RegExp(`^\\s*${escapeRegex(text)}\\s*$`);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Entra con un usuario QA (clave de users.json). Admite cambiar de usuario en un test. */
      loginAs(key: string): Chainable<QaUser>;
      /** Rol con el que corre el test (columna "role" de la web). */
      role(description: string): Chainable<null>;
      /** Espera a que no haya peticiones a Supabase en vuelo durante `quietMs`. */
      waitForQuietNetwork(quietMs?: number): Chainable<void>;
      openTab(label: string): Chainable<void>;
      /** Toast (.tactical-toast) que contiene el texto. */
      expectToast(text: string): Chainable<void>;
      /** Abre el detalle de una partida y espera a la recarga que lanza al abrirse. */
      openEvent(title: string): Chainable<void>;
      /** Títulos de las partidas de la pestaña Partidas. */
      visibleEventTitles(): Chainable<string[]>;
    }
  }
}

// Cuenta las peticiones a Supabase (fetch) desde antes de que cargue la app: Cypress deja
// tocar la ventana justo antes (window:before:load). Mismo contador que en qa-selenium.
Cypress.on("window:before:load", (win: any) => {
  const qa = (win.__qa = { inflight: 0, total: 0, last: Date.now() });
  const isApi = (u: unknown) => /\/(rest|auth|storage)\/v1\//.test(String(u));
  const original = win.fetch.bind(win);
  win.fetch = (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url;
    if (!isApi(url)) return original(input, init);
    qa.inflight++; qa.total++; qa.last = Date.now();
    return original(input, init).finally(() => { qa.inflight--; qa.last = Date.now(); });
  };
});

let users: QaUser[] | null = null;
const qaUser = (key: string) =>
  (users ? cy.wrap(users, { log: false }) : cy.task<QaUser[]>("qaUsers", null, { log: false }).then((u) => (users = u)))
    .then((list) => {
      const user = (list as QaUser[]).find((u) => u.key === key);
      if (!user) throw new Error(`Usuario QA desconocido: ${key}`);
      return user;
    });

Cypress.Commands.add("role", (description: string) =>
  cy.task("setRole", { test: Cypress.currentTest.title, role: description }, { log: false }));

Cypress.Commands.add("loginAs", (key: string) =>
  qaUser(key).then((user) => {
    cy.role(user.nickname);
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit("/");
    cy.get('[data-testid="qa-email-input"]').clear().type(user.email);
    // cy.env: la contraseña es un secreto (Cypress 16 no la expone al navegador como valor
    // público) y log: false evita que salga en el registro de comandos.
    cy.env(["QA_PASSWORD"], { log: false }).then(({ QA_PASSWORD }) => {
      cy.get('[data-testid="qa-password-input"]').clear().type(QA_PASSWORD, { log: false });
    });
    cy.get('[data-testid="qa-login-btn"]').click();
    cy.get('[data-testid="qa-login-btn"]').should("not.exist");
    cy.waitForQuietNetwork(); // carga inicial de datos tras el login
    return cy.wrap(user, { log: false });
  }));

Cypress.Commands.add("waitForQuietNetwork", (quietMs = 700) => {
  cy.window({ log: false }).should((win: any) => {
    const qa = win.__qa;
    expect(qa, "contador de red").to.exist;
    expect(qa.inflight, "peticiones en vuelo").to.eq(0);
    expect(Date.now() - qa.last, "ms sin peticiones").to.be.gte(quietMs);
  });
});

Cypress.Commands.add("openTab", (label: string) => {
  cy.get('nav[aria-label="Navegación principal"]').contains("button", exactly(label)).click();
});

Cypress.Commands.add("expectToast", (text: string) => {
  cy.contains(".tactical-toast", text).should("be.visible");
});

Cypress.Commands.add("openEvent", (title: string) => {
  cy.openTab("Partidas");
  cy.window({ log: false }).then((win: any) => {
    const before = win.__qa.total;
    cy.contains("article.event-card", title).find(".tactical-btn--blue").click();
    cy.contains(".modal h1, .modal h2, .modal h3", exactly("Detalle de partida")).should("be.visible");
    // La recarga que lanza el modal al abrirse (loadCloudData): petición nueva y red en reposo.
    cy.window({ log: false }).its("__qa.total", { timeout: 15_000 }).should("be.gt", before);
    cy.waitForQuietNetwork();
  });
});

Cypress.Commands.add("visibleEventTitles", () => {
  cy.openTab("Partidas");
  cy.get("article.event-card").should("have.length.greaterThan", 0);
  return cy.get("article.event-card .event-card__title").then(($els) => [...$els].map((el) => el.innerText));
});

// Filtro de tests elegidos en la web (GREP = regex de títulos). Los que no encajan se omiten y
// cypress.config.ts no los publica.
const filteredOut = () => {
  const grep = Cypress.expose("grep") as string | undefined;
  return !!grep && !new RegExp(grep).test(Cypress.currentTest.title);
};
beforeEach(function () {
  if (filteredOut()) this.skip();
});

// Captura al final de cada test (pase o falle): es la única evidencia que se publica. El
// config la convierte a JPEG (after:screenshot) y la enlaza en result.json por su nombre.
afterEach(() => {
  if (filteredOut()) return; // omitido por el filtro: sin captura
  cy.screenshot(slug(Cypress.currentTest.title), { capture: "viewport", log: false });
});

export {};
