import { exactly } from "../../support/utils";

// Suite A · Autenticación y perfiles. Mismos casos que qa-playwright/tests/a-auth/auth.spec.ts.

const NAV = 'nav[aria-label="Navegación principal"]';
const LOGIN = '[data-testid="qa-login-btn"]';
const FICHA = ".modal:has(h2:contains('Tu ficha de operador'))";

describe("Suite A · Autenticación", () => {
  before(() => cy.task("resetStaging")); // la suite parte del seed

  it("TC-SMOKE La app carga y muestra el login QA", () => {
    cy.role("Visitante");
    cy.visit("/");
    cy.title().should("not.be.empty");
    cy.get(LOGIN).should("be.visible");
  });

  it("TC-A01 Jugador con equipo entra y ve la navegación completa", () => {
    cy.loginAs("player_mad").then((user) => {
      cy.get('[title="Editar mi ficha de operador"]').should("contain.text", user.nickname);
    });
    for (const tab of ["Calendario", "Partidas", "Jugadores", "Normas"]) {
      cy.get(NAV).contains("button", exactly(tab)).should("be.visible");
    }
    cy.contains("button", exactly("+ Nueva partida")).should("be.visible");
  });

  it("TC-A01b Usuario sin equipo queda pendiente de asignación", () => {
    cy.loginAs("sinequipo");
    cy.contains("h1, h2, h3", exactly("Pendiente de asignación de equipo")).should("be.visible");
    cy.get(NAV).should("not.exist");
    cy.contains("button", exactly("+ Nueva partida")).should("not.exist");
  });

  // Detectó un bug real en Playwright (19-nov-2026, ya corregido en el staging): la RLS no dejaba
  // a un bloqueado leer su propio perfil y veía "Pendiente de asignación".
  it("TC-A02 Usuario bloqueado ve acceso denegado", () => {
    cy.loginAs("blocked");
    cy.contains("h1, h2, h3", exactly("Acceso denegado")).should("be.visible");
  });

  it("TC-A02b Usuario bloqueado no accede a ningún dato", () => {
    cy.loginAs("blocked");
    cy.contains(/Pendiente de asignación|Acceso denegado/).should("be.visible");
    cy.get(NAV).should("not.exist");
    cy.contains("button", exactly("+ Nueva partida")).should("not.exist");
    cy.get("article.event-card").should("not.exist");
  });

  it("TC-A04 Contraseña incorrecta muestra error y no entra", () => {
    cy.role("Visitante");
    cy.task<{ key: string; email: string }[]>("qaUsers").then((users) => {
      cy.visit("/");
      cy.get('[data-testid="qa-email-input"]').type(users.find((u) => u.key === "player_mad")!.email);
      cy.get('[data-testid="qa-password-input"]').type("contraseña-incorrecta");
      cy.get(LOGIN).click();
    });
    cy.expectToast("Error al iniciar sesión");
    cy.get(LOGIN).should("be.visible");
    cy.get(NAV).should("not.exist");
  });

  it("TC-A05 Cerrar sesión vuelve a la pantalla de login", () => {
    cy.loginAs("player_mad");
    cy.get(".app-header").contains("button", exactly("Salir")).click();
    cy.get(LOGIN).should("be.visible");
    cy.get(NAV).should("not.exist");
  });

  it("TC-A03 Editar la ficha de operador guarda equipaciones y roles", () => {
    cy.loginAs("player_foe").then((user) => {
      cy.get('[title="Editar mi ficha de operador"]').click();
      cy.get(FICHA).should("be.visible");
      cy.get(FICHA).contains("button", /^\s*MultiCam/).click();
      cy.get(FICHA).contains("button", /^\s*Médico/).click();
      cy.get(FICHA).contains("button", exactly("Guardar perfil")).click();
      cy.expectToast(`Perfil actualizado: ${user.nickname}.`);
      cy.get(FICHA).should("not.exist");
    });

    // Persistencia: tras recargar, la ficha conserva lo marcado.
    cy.reload();
    cy.waitForQuietNetwork();
    cy.get('[title="Editar mi ficha de operador"]').click();
    cy.get(FICHA).contains("button", /^\s*MultiCam ✓/).should("be.visible");
    cy.get(FICHA).contains("button", /^\s*Médico ✓/).should("be.visible");
  });
});
