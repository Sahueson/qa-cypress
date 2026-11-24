import { exactly } from "../../support/utils";

// Suite I · Normas (PDF del equipo en el bucket PRIVADO team-documents). Mismos casos que
// qa-playwright/tests/i-normas: subida, enlace firmado, la URL pública no sirve, borrado (fila +
// fichero) y quién puede subir y ver. El reset borra las filas y sus ficheros.

// PDF mínimo válido (una página en blanco), generado en memoria.
const PDF =
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
const FORM = "form:has(button:contains('Publicar PDF'))";
const TITLE = 'input[placeholder="Ej. Estatutos Oficiales FOE"]';

const uploadStatutes = (title: string) => {
  cy.openTab("Normas");
  cy.contains("button", exactly("+ Subir PDF")).click();
  // La app rellena el título con el nombre del fichero: se sube con el título como nombre y se
  // comprueba que el campo lo recoge (escribir encima justo después a veces chocaba con ese relleno).
  cy.get(`${FORM} input[type="file"]`).selectFile({ contents: Cypress.Buffer.from(PDF), fileName: `${title}.pdf`, mimeType: "application/pdf" });
  cy.get(`${FORM} ${TITLE}`).should("have.value", title);
  cy.get(FORM).contains("button", exactly("Publicar PDF")).click();
  cy.expectToast("Documento PDF publicado correctamente.");
  cy.get(FORM).should("not.exist");
};
const fullscreenHref = () => cy.contains("a", exactly("Pantalla completa")).invoke("attr", "href");

describe("Suite I · Normas del equipo", () => {
  before(() => cy.task("resetStaging"));

  it("TC-I01 Subir unos estatutos: se ven con enlace firmado y la URL pública no los sirve", () => {
    cy.loginAs("admin_foe");
    const title = `QA E2E · Estatutos ${Date.now()}`;
    uploadStatutes(title);

    cy.contains(title).should("be.visible");
    fullscreenHref().then((href) => {
      expect(href).to.match(/\/storage\/v1\/object\/sign\/team-documents\/foe\/statutes\/.+\.pdf\?token=/);
      cy.request(href!).then((res) => {
        expect(res.status).to.eq(200);
        expect(String(res.body).slice(0, 5)).to.eq("%PDF-");
      });
      // Mismo objeto por la ruta pública (sin firma): el bucket es privado.
      const publicUrl = href!.replace("/object/sign/", "/object/public/").replace(/\?.*$/, "");
      cy.request({ url: publicUrl, failOnStatusCode: false }).its("status").should("not.eq", 200);
    });
  });

  it("TC-I02 Eliminar un documento borra también el fichero", () => {
    // apikey y sesión con los que la propia app habla con Supabase (para preguntar a Storage).
    let apikey = "";
    cy.intercept({ url: /\/rest\/v1\// }, (req) => { apikey ||= String(req.headers["apikey"] ?? ""); });
    cy.loginAs("admin_foe");
    const title = `QA E2E · Estatutos a borrar ${Date.now()}`;
    uploadStatutes(title);

    fullscreenHref().then((href) => {
      cy.contains("button", exactly("Eliminar")).click();
      cy.expectToast("Documento eliminado.");
      cy.contains(title).should("not.exist");

      // ¿Sigue el fichero en Storage? No se reutiliza el enlace firmado (la CDN puede seguir
      // sirviéndolo ~60 s): se pide al servidor un enlace NUEVO; si el fichero no existe, lo rechaza.
      const url = new URL(href!);
      const objectPath = url.pathname.replace(/^.*\/object\/sign\/team-documents\//, "");
      cy.window().then((win) => {
        const key = Object.keys(win.localStorage).find((k) => k.endsWith("-auth-token"));
        const token = key ? JSON.parse(win.localStorage.getItem(key)!).access_token : null;
        expect(token, "sesión").to.be.a("string");
        expect(apikey, "apikey").to.not.be.empty;
        cy.request({
          method: "POST",
          url: `${url.origin}/storage/v1/object/sign/team-documents/${objectPath}`,
          headers: { apikey, Authorization: `Bearer ${token}` },
          body: { expiresIn: 60 },
          failOnStatusCode: false,
        }).its("status").should("not.eq", 200);
      });
    });
  });

  it("TC-I03 El formulario exige título y solo acepta PDF", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Normas");
    cy.contains("button", exactly("+ Subir PDF")).click();

    cy.get(FORM).contains("button", exactly("Publicar PDF")).click();
    cy.get(`${FORM} .modal__error`).should("have.text", "Indica un título para el documento.");
    cy.get(`${FORM} input[type="file"]`).selectFile({ contents: Cypress.Buffer.from("hola"), fileName: "notas.txt", mimeType: "text/plain" });
    cy.get(`${FORM} .modal__error`).should("have.text", "Solo se permiten archivos en formato PDF (.pdf).");
    cy.get(`${FORM} ${TITLE}`).type("QA E2E · Sin fichero");
    cy.get(FORM).contains("button", exactly("Publicar PDF")).click();
    cy.get(`${FORM} .modal__error`).should("have.text", "Selecciona un archivo PDF.");
  });

  it("TC-I04 Un jugador ve las normas de su equipo pero no puede subir ni borrar", () => {
    cy.loginAs("admin_foe");
    const title = `QA E2E · Normas para jugadores ${Date.now()}`;
    uploadStatutes(title);

    cy.loginAs("player_foe");
    cy.openTab("Normas");
    cy.contains(title).should("be.visible");
    cy.contains("button", exactly("+ Subir PDF")).should("not.exist");
    cy.contains("button", exactly("Eliminar")).should("not.exist");
  });

  it("TC-I05 Un jugador de otro equipo no ve las normas del FOE", () => {
    cy.loginAs("admin_foe");
    const title = `QA E2E · Normas solo FOE ${Date.now()}`;
    uploadStatutes(title);

    cy.loginAs("player_mad");
    cy.openTab("Normas");
    cy.contains("Todavía no hay estatutos o normativa publicados para MAD Irregulars.").should("be.visible");
    cy.get('[data-testid="docs-squad-select"]').should("not.exist");
    cy.contains(title).should("not.exist");
  });
});
