import { MODAL, cardButton, modalButton, modalText, registrationSelect } from "../../support/app";

// Suite C · Inscripciones y reglas de negocio. Mismos casos que qa-playwright/tests/c-inscripciones.

describe("Suite C · Inscripciones", () => {
  before(() => cy.task("resetStaging"));

  it("TC-C01 Inscribirse preselecciona la equipación de la partida y avisa si no la tienes", () => {
    // junta2 tiene Árido en su ficha; la partida recomienda Tiger Stripe.
    cy.loginAs("junta2");
    cy.openEvent("QA FOE · Inscripción abierta");
    registrationSelect(0).should("contain.text", "Tiger Stripe");
    modalText("No tienes «Tiger Stripe» marcada en tu ficha").should("be.visible");

    modalButton("Apuntarse").click();
    cy.expectToast("Inscripción guardada en la nube.");
    modalText("Inscritos (1)").should("be.visible");
    modalText("QA Junta 2 (Tú)").should("be.visible");
    modalButton("Actualizar inscripción").should("be.visible");
  });

  it("TC-C07 Sin equipación en la partida se preselecciona la de la ficha del jugador", () => {
    cy.loginAs("junta2"); // ficha: Árido + Médico
    cy.openEvent("QA FOE · MilSim próxima"); // sin equipación recomendada
    registrationSelect(0).should("contain.text", "Árido");
    registrationSelect(1).should("contain.text", "Médico");
    cy.get(MODAL).contains(/No tienes «.*» marcada/).should("not.exist");
  });

  it("TC-C04 Darse de baja a más de 48 h libera la plaza", () => {
    cy.loginAs("player_foe");
    cy.openEvent("QA FOE · Inscripción abierta");
    modalButton("Apuntarse").click();
    cy.expectToast("Inscripción guardada en la nube.");

    modalButton("Darse de baja").click();
    cy.expectToast("Has cancelado tu inscripción.");
    cy.get(MODAL).contains("QA Jugador FOE (Tú)").should("not.exist");
    modalButton("Apuntarse").should("be.visible");
  });

  it("TC-C02 A menos de 48 h no se permite darse de baja", () => {
    cy.loginAs("player_foe"); // inscrito por el seed
    cy.openEvent("QA FOE · Partida en menos de 48 h");
    modalText("Faltan menos de 48 horas para la partida").should("be.visible");
    cy.get(MODAL).contains("button", /^\s*Darse de baja\s*$/).should("not.exist");
    // Sí puede actualizar equipación o rol.
    modalButton("Actualizar inscripción").should("be.visible");
  });

  it("TC-C03 Con una excedencia aprobada no se puede inscribir en esas fechas", () => {
    cy.loginAs("player_mad"); // excedencia aprobada que cubre la partida
    cy.openTab("Partidas");
    cardButton("QA MAD · Partida en excedencia", "En excedencia").should("be.visible");

    cy.openEvent("QA MAD · Partida en excedencia");
    modalText("Tienes una excedencia concedida").should("be.visible");
    cy.get(MODAL).contains("button", /^\s*Apuntarse\s*$/).should("not.exist");
  });

  it("TC-C05 Una partida ya finalizada no admite inscripciones", () => {
    cy.loginAs("player_foe");
    cy.openEvent("QA FOE · Partida pasada abierta");
    modalText("ya ha finalizado; las inscripciones y bajas están cerradas").should("be.visible");
    cy.get(MODAL).contains("button", /^\s*Apuntarse\s*$/).should("not.exist");
  });

  it("TC-C06 Una partida cancelada no admite inscripciones", () => {
    cy.loginAs("player_foe");
    cy.openEvent("QA FOE · Partida cancelada");
    modalText("CANCELADA · NO CUENTA").should("be.visible");
    modalText("está cancelada; no se permiten inscripciones").should("be.visible");
    cy.get(MODAL).contains("button", /^\s*Apuntarse\s*$/).should("not.exist");
  });
});
