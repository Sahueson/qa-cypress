import { inDays, leaveRow, openLeavesPanel } from "../../support/app";
import { exactly } from "../../support/utils";

// Suite F · Excedencias FOE (Art. 18 y 19): las solicita el jugador, las concede la Junta Directiva
// y nadie se concede la suya. Duración entre 1 mes y 1 año. Mismos casos que qa-playwright/tests/f-excedencias.

const requestLeave = (start: number, end: number, reason: string) => {
  openLeavesPanel();
  cy.get('form input[type="date"]').eq(0).clear().type(inDays(start));
  cy.get('form input[type="date"]').eq(1).clear().type(inDays(end));
  cy.get('input[placeholder*="Motivos laborales / Lesión"]').type(reason);
  cy.contains("button", exactly("Solicitar excedencia a Junta Directiva")).click();
};

describe("Suite F · Excedencias", () => {
  before(() => cy.task("resetStaging"));

  it("TC-F01 Un jugador solicita una excedencia y queda pendiente de la Junta", () => {
    cy.loginAs("player_foe");
    requestLeave(40, 80, "Excedencia E2E · lesión");
    cy.expectToast("Solicitud de excedencia enviada.");
    leaveRow("Excedencia E2E · lesión").should("contain.text", "PENDIENTE DE JUNTA");
    leaveRow("Excedencia E2E · lesión").contains("button", exactly("Conceder")).should("not.exist");
  });

  it("TC-F02 Una excedencia de menos de 1 mes se rechaza", () => {
    cy.loginAs("player_foe");
    requestLeave(40, 45, "Excedencia E2E · corta");
    cy.expectToast("La excedencia debe tener una duración mínima de 1 mes");
    cy.contains("Excedencia E2E · corta").should("not.exist");
  });

  it("TC-F03 La Junta Directiva concede una solicitud pendiente", () => {
    cy.loginAs("admin_foe");
    openLeavesPanel();
    const reason = "Solicitud QA pendiente"; // de QA Jugador FOE (seed)
    leaveRow(reason).should("contain.text", "PENDIENTE DE JUNTA");
    leaveRow(reason).contains("button", exactly("Conceder")).click();
    cy.expectToast("Excedencia concedida.");
    leaveRow(reason).should("contain.text", "CONCEDIDA");
  });

  it("TC-F04 Nadie puede concederse su propia excedencia", () => {
    cy.loginAs("admin_foe"); // es de la Junta Directiva, pero la solicitud es suya
    openLeavesPanel();
    leaveRow("Solicitud QA propia").should("contain.text", "PENDIENTE DE JUNTA");
    leaveRow("Solicitud QA propia").contains("button", exactly("Conceder")).should("not.exist");
  });

  it("TC-F05 Un jugador sin cargo no puede conceder excedencias", () => {
    cy.loginAs("player_foe");
    openLeavesPanel();
    cy.contains("button", exactly("Conceder")).should("not.exist");
    cy.contains("button", exactly("Conceder y aplicar excedencia")).should("not.exist");
  });
});
