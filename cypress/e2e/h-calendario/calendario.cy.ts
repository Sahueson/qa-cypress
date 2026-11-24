import { dropdownOptions, inDays } from "../../support/app";
import { exactly } from "../../support/utils";

// Suite H · Calendario: fechas de vacaciones / "No se juega" (team_blackouts). Mismos casos que
// qa-playwright/tests/h-calendario. Seed: "QA · Sin partida FOE" (+25 a +26) y "QA · Sin partida MAD" (+27).

const MARK = 'Marcar vacaciones / "No se juega"';
const FORM = "form:has(button:contains('Guardar fechas sin partida'))";
const REASON = 'input[placeholder="Ej. Vacaciones de verano / Puente"]';

/** Fila del listado "Vacaciones / Sin partida": <fila><botón "fechas · motivo"/><Quitar/></fila>. */
const blackoutRow = (reason: string) => cy.contains("button", `· ${reason}`).parent();
const noBlackoutRow = (reason: string) => cy.contains("button", `· ${reason}`).should("not.exist");

const openForm = () => {
  cy.openTab("Calendario");
  cy.contains("button", exactly(MARK)).click();
};

describe("Suite H · Calendario y fechas sin partida", () => {
  before(() => cy.task("resetStaging"));

  it("TC-H01 Un admin marca fechas sin partida para su equipo", () => {
    cy.loginAs("admin_mad");
    openForm();
    const reason = `QA E2E · Puente ${Date.now()}`;
    cy.get(`${FORM} input[type="date"]`).eq(0).clear().type(inDays(40));
    cy.get(`${FORM} input[type="date"]`).eq(1).clear().type(inDays(42));
    cy.get(`${FORM} ${REASON}`).clear().type(reason);
    cy.get(FORM).contains("button", exactly("Guardar fechas sin partida")).click();

    cy.expectToast('Fechas de vacaciones / "No se juega" guardadas.');
    cy.get(FORM).should("not.exist");
    blackoutRow(reason).should("contain.text", `[MAD Irregulars] ${inDays(40)} → ${inDays(42)}`);
  });

  it("TC-H02 La fecha de fin no puede ser anterior a la de inicio", () => {
    cy.loginAs("admin_mad");
    openForm();
    const reason = `QA E2E · Fechas al revés ${Date.now()}`;
    cy.get(`${FORM} input[type="date"]`).eq(0).clear().type(inDays(50));
    cy.get(`${FORM} input[type="date"]`).eq(1).clear().type(inDays(45));
    cy.get(`${FORM} ${REASON}`).clear().type(reason);
    cy.get(FORM).contains("button", exactly("Guardar fechas sin partida")).click();

    // "Hasta" lleva min = "Desde": la validación del propio navegador impide enviar el formulario
    // (el mensaje de la app no llega a salir). No se guarda nada.
    cy.get(`${FORM} input[type="date"]`).eq(1).then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.rangeUnderflow, "fin anterior al inicio").to.be.true;
    });
    cy.get(FORM).should("be.visible");
    noBlackoutRow(reason);
  });

  it("TC-H03 Un admin de un solo equipo no puede marcar fechas para ambos", () => {
    cy.loginAs("admin_mad");
    openForm();
    dropdownOptions(`${FORM} [data-testid="blackout-squad-select"]`).should("deep.equal", ["MAD Irregulars"]);
  });

  it("TC-H04 El super admin puede marcar fechas para ambos equipos", () => {
    cy.loginAs("superadmin");
    openForm();
    dropdownOptions(`${FORM} [data-testid="blackout-squad-select"]`).should("deep.equal", ["MAD Irregulars", "FOE", "Ambos equipos (MAD Irregulars y FOE)"]);
    // Y ve las fechas de los dos equipos.
    blackoutRow("QA · Sin partida FOE").should("be.visible");
    blackoutRow("QA · Sin partida MAD").should("be.visible");
  });

  it("TC-H05 Cada equipo solo ve sus fechas y un jugador no puede quitarlas", () => {
    cy.loginAs("player_mad");
    cy.openTab("Calendario");
    blackoutRow("QA · Sin partida MAD").should("be.visible");
    blackoutRow("QA · Sin partida MAD").contains("button", exactly("Quitar")).should("not.exist");
    noBlackoutRow("QA · Sin partida FOE");
    cy.contains("button", exactly(MARK)).should("not.exist");
  });

  it("TC-H06 Un admin quita las fechas de su equipo y no persisten al recargar", () => {
    cy.loginAs("admin_mad");
    cy.openTab("Calendario");
    blackoutRow("QA · Sin partida MAD").contains("button", exactly("Quitar")).click();

    cy.expectToast("Fechas eliminadas del calendario.");
    noBlackoutRow("QA · Sin partida MAD");
    cy.reload();
    cy.waitForQuietNetwork();
    cy.openTab("Calendario");
    cy.contains("button", exactly(MARK)).should("be.visible");
    noBlackoutRow("QA · Sin partida MAD");
  });

  it("TC-H07 Un día sin partida se avisa al seleccionarlo en el calendario", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Calendario");
    // Pulsar la fila lleva el calendario a ese mes y selecciona el primer día.
    cy.contains("button", "· QA · Sin partida FOE").click();
    cy.contains("strong", "No se juega (FOE):").should("be.visible")
      .parent().should("contain.text", "QA · Sin partida FOE");
  });
});
