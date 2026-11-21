import { exactly } from "../../support/utils";

// Suite J · Demo de fallos: escenarios que FALLAN A PROPÓSITO (requisitos que la app no cumple) para enseñar cómo sale un
// fallo y su reporte de bug. No modifican nada. Mismos casos que qa-playwright/tests/j-demo-fallos.
const LIMIT = { timeout: 3000 };

describe("Suite J · Demo de fallos (fallan a propósito)", () => {
  before(() => cy.task("resetStaging"));

  it("TC-J01 El jugador MAD ve las partidas del equipo FOE (requisito inexistente)", () => {
    cy.loginAs("player_mad");
    cy.contains("QA FOE · Partida próxima", LIMIT).should("be.visible");
  });

  it("TC-J02 El jugador FOE ve las partidas del equipo MAD (requisito inexistente)", () => {
    cy.loginAs("player_foe");
    cy.contains("QA MAD · Partida próxima", LIMIT).should("be.visible");
  });

  it("TC-J03 El super admin dispone de un panel de métricas", () => {
    cy.loginAs("superadmin");
    cy.contains("h1, h2, h3, h4", exactly("Panel de métricas"), LIMIT).should("be.visible");
  });

  it("TC-J04 El jugador sin equipo puede crear partidas", () => {
    cy.loginAs("sinequipo");
    cy.contains("button", exactly("Crear partida"), LIMIT).should("be.visible");
  });

  it("TC-J05 El jugador bloqueado sigue viendo el calendario de su equipo", () => {
    cy.loginAs("blocked");
    cy.contains("QA MAD · Partida próxima", LIMIT).should("be.visible");
  });

  it("TC-J06 El admin MAD tiene una pestaña de Facturación", () => {
    cy.loginAs("admin_mad");
    cy.contains("button", exactly("Facturación"), LIMIT).should("be.visible");
  });

  it("TC-J07 El jugador MAD puede exportar el calendario a PDF", () => {
    cy.loginAs("player_mad");
    cy.contains("button", exactly("Exportar calendario (PDF)"), LIMIT).should("be.visible");
  });
});
