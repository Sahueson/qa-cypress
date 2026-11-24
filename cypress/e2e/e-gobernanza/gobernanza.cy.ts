import { chooseOption, openFoeSection, pollCard } from "../../support/app";
import { exactly } from "../../support/utils";

// Suite E · Gobernanza y régimen disciplinario FOE. Mismos casos que qa-playwright/tests/e-gobernanza.
// El recuento, el cierre y el escalado los decide el servidor (close_foe_poll). Junta Directiva =
// QA Super Admin, QA Admin FOE y QA Junta 2; el seed deja cada expediente a falta del voto de
// junta2, salvo el de recusación.

const DIRECTIVA = "Votos · Junta Directiva";
const A_FAVOR = /^\s*A favor de sancionar/;
const EN_CONTRA = /^\s*En contra de sancionar/;

describe("Suite E · Gobernanza FOE", () => {
  before(() => cy.task("resetStaging"));

  it("TC-E01 La Junta Directiva abre un expediente sancionador", () => {
    cy.loginAs("admin_foe");
    openFoeSection(DIRECTIVA);
    cy.contains("button", exactly("+ Nueva votación")).click();

    const form = "form:contains('Convocar votación en Junta Directiva')";
    chooseOption(`${form} [data-testid="foe-poll-topic-select"]`, "Votación de sanción a operador");
    chooseOption(`${form} [data-testid="foe-sanction-target-select"]`, "QA Jugador FOE");
    chooseOption(`${form} [data-testid="foe-sanction-severity-select"]`, "Falta Grave");
    cy.get(`${form} [placeholder*="Art. 51.i"]`).type("Art. 36.2 — Baja < 48h");
    cy.get(`${form} [placeholder*="Explica los hechos"]`).type("Baja sin aviso en la partida del domingo (E2E).");
    cy.get(form).contains("button", exactly("Publicar votación")).click();

    const card = () => pollCard("Propuesta de Falta Grave a QA Jugador FOE");
    card().should("be.visible");
    card().contains("Art. 36.2 — Baja < 48h").should("be.visible");
    card().contains("button", A_FAVOR).should("be.enabled");
  });

  it("TC-E02 El propuesto para sanción queda recusado y no puede votar", () => {
    cy.loginAs("junta2");
    openFoeSection(DIRECTIVA);
    const card = () => pollCard("QA · Sanción a QA Junta 2 (recusación)");
    card().contains("Recusación (Art. 53.4)").should("be.visible");
    card().contains("button", A_FAVOR).should("be.disabled");
    card().contains("button", EN_CONTRA).should("be.disabled");
  });

  it("TC-E03 El expediente se cierra solo al votar el último miembro habilitado", () => {
    cy.loginAs("junta2");
    openFoeSection(DIRECTIVA);
    const card = () => pollCard("QA · Sanción con cuórum pendiente");
    card().contains("button", A_FAVOR).click();
    cy.expectToast("Sanción aprobada (2 a favor vs 0 en contra) y registrada");
    card().contains("SANCIÓN APROBADA Y REGISTRADA").should("be.visible");
  });

  it("TC-E04 La 3ª falta leve en un año se escala a Grave", () => {
    cy.loginAs("junta2");
    openFoeSection(DIRECTIVA);
    pollCard("QA · Tercera falta leve").contains("button", A_FAVOR).click();
    cy.expectToast("Escalada a Grave por 3ª falta leve en 1 año · Art. 51.k");
  });

  it("TC-E05 La 3ª falta grave en un año se escala a Muy Grave", () => {
    cy.loginAs("junta2");
    openFoeSection(DIRECTIVA);
    pollCard("QA · Tercera falta grave").contains("button", A_FAVOR).click();
    cy.expectToast("Escalada a Muy Grave por 3ª falta grave en 1 año · Art. 50.m");
  });

  it("TC-E06 Con mayoría en contra el expediente se cierra sin sanción", () => {
    cy.loginAs("junta2");
    openFoeSection(DIRECTIVA);
    const card = () => pollCard("QA · Sanción a desestimar");
    card().contains("button", EN_CONTRA).click();
    cy.expectToast("Votación cerrada (0 a favor vs 3 en contra). No se aplica sanción");
    card().contains("SANCIÓN DESESTIMADA").should("be.visible");
  });

  it("TC-E07 Solo quien convoca (o el super admin) puede cerrar una votación a mano", () => {
    cy.loginAs("junta2"); // no convocó la votación del seed
    openFoeSection(DIRECTIVA);
    pollCard("QA · Votación de la Junta Directiva").contains("button", exactly("Cerrar y resolver")).should("not.exist");
  });

  it("TC-E08 Quien convocó la votación puede cerrarla a mano", () => {
    cy.loginAs("admin_foe");
    openFoeSection(DIRECTIVA);
    const card = () => pollCard("QA · Votación de la Junta Directiva");
    card().contains("button", exactly("Cerrar y resolver")).click();
    cy.expectToast("Votación cerrada y resultado fijado.");
    card().contains("button", exactly("Cerrar y resolver")).should("not.exist");
  });
});
