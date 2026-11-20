import { MODAL, cardButton, eventCard, inDays, modalButton, modalText } from "../../support/app";
import { exactly } from "../../support/utils";

// Suite B · Ciclo de vida de partidas. Mismos casos que qa-playwright/tests/b-eventos/eventos.spec.ts:
// crear, cancelar, reactivar, editar, eliminar, cerrar el acta y desbloquearla (aprobación de los
// demás responsables, RPC del servidor).

const NEW_FORM = ".modal:has(h2:contains('Nueva partida'))";
const EDIT_FORM = ".modal:has(h2:contains('Editar partida'))";
const TITLE = 'input[placeholder="Ej. Dominical CQB / Operación Tormenta"]';
const FIELD = 'input[placeholder="Ej. El Cortijo / Bunker / Campo Norte"]';
const LOCKED = "Partida cerrada y bloqueada";

describe("Suite B · Ciclo de vida de partidas", () => {
  before(() => cy.task("resetStaging"));

  it("TC-B01 Crear partida valida los campos obligatorios", () => {
    cy.loginAs("admin_mad");
    cy.contains("button", exactly("+ Nueva partida")).click();
    // El formulario propone una fecha por defecto: se vacía para probar su validación.
    cy.get(`${NEW_FORM} input[type="date"]`).clear();
    cy.get(NEW_FORM).contains("button", exactly("Crear partida")).click();
    cy.get(`${NEW_FORM} .modal__error`).should("have.text", "El título de la partida es obligatorio.");

    cy.get(`${NEW_FORM} ${TITLE}`).type("QA E2E · Validación");
    cy.get(NEW_FORM).contains("button", exactly("Crear partida")).click();
    cy.get(`${NEW_FORM} .modal__error`).should("have.text", "Selecciona la fecha de la partida.");

    cy.get(`${NEW_FORM} input[type="date"]`).type(inDays(15));
    cy.get(NEW_FORM).contains("button", exactly("Crear partida")).click();
    cy.get(`${NEW_FORM} .modal__error`).should("have.text", "Indica el campo de juego.");
  });

  it("TC-B01b Un admin crea una partida y aparece en la lista", () => {
    cy.loginAs("admin_mad");
    const title = `QA E2E · Partida creada ${Date.now()}`;
    cy.contains("button", exactly("+ Nueva partida")).click();
    cy.get(`${NEW_FORM} ${TITLE}`).type(title);
    cy.get(`${NEW_FORM} input[type="date"]`).clear().type(inDays(15));
    cy.get(`${NEW_FORM} input[type="time"]`).clear().type("10:00");
    cy.get(`${NEW_FORM} ${FIELD}`).type("Campo QA E2E");
    cy.get(NEW_FORM).contains("button", exactly("Crear partida")).click();

    cy.expectToast("Partida creada para MAD Irregulars.");
    cy.get(NEW_FORM).should("not.exist");
    cy.openTab("Partidas");
    eventCard(title).should("be.visible");
  });

  it("TC-B02 Cancelar una partida sin contar asistencia", () => {
    cy.loginAs("admin_mad");
    cy.openEvent("QA MAD · Partida próxima");
    modalButton("Cancelar partida").click();
    cy.get(MODAL).contains("label", "No contar asistencia").find("input").check();
    cy.get(`${MODAL} input[placeholder="Ej. Lluvia / Campo cerrado / Falta de jugadores"]`).type("Lluvia (QA)");
    modalButton("Confirmar cancelación").click();

    cy.expectToast("Partida cancelada y descontada del total de partidas.");
    modalText("CANCELADA · NO CUENTA").should("be.visible");
    modalButton("Reactivar partida").should("be.visible");
  });

  it("TC-B02b Cancelar una partida contando asistencia permite pasar lista", () => {
    cy.loginAs("admin_foe");
    cy.openEvent("QA FOE · Partida próxima");
    modalButton("Cancelar partida").click();
    cy.get(MODAL).contains("label", "Sí, contar asistencia").find("input").check();
    modalButton("Confirmar cancelación").click();

    cy.expectToast("Partida cancelada (cuenta asistencia");
    modalText("CANCELADA · CUENTA ASISTENCIA").should("be.visible");
  });

  it("TC-B03 Cerrar el acta bloquea la partida en solo lectura", () => {
    cy.loginAs("admin_foe");
    cy.openEvent("QA FOE · Partida finalizada");
    modalButton("Guardar asistencia y bloquear partida").click();

    cy.expectToast("Asistencia guardada y partida bloqueada.");
    cy.get(MODAL).contains(exactly("BLOQUEADA")).should("be.visible");
    modalText(LOCKED).should("be.visible");
    cy.get(MODAL).contains("button", exactly("Editar partida")).should("not.exist");
    cy.get(MODAL).contains("button", exactly("Cancelar partida")).should("not.exist");
  });

  it("TC-B04 Un jugador no puede editar ni cancelar partidas ajenas", () => {
    cy.loginAs("player_foe");
    cy.openEvent("QA FOE · MilSim próxima");
    cy.get(MODAL).contains("button", exactly("Editar partida")).should("not.exist");
    cy.get(MODAL).contains("button", exactly("Cancelar partida")).should("not.exist");
  });

  it("TC-B05 Un admin edita una partida de su equipo", () => {
    cy.loginAs("admin_mad");
    const title = `QA MAD · Partida editada ${Date.now()}`;
    cy.openTab("Partidas");
    cardButton("QA MAD · Partida a editar", "Editar").click();
    cy.get(`${EDIT_FORM} ${TITLE}`).clear().type(title);
    cy.get(EDIT_FORM).contains("button", exactly("Guardar cambios")).click();

    cy.expectToast("Partida actualizada.");
    cy.get(EDIT_FORM).should("not.exist");
    eventCard(title).should("be.visible");
    cy.contains("article.event-card", "QA MAD · Partida a editar").should("not.exist");
  });

  it("TC-B06 Reactivar una partida cancelada", () => {
    cy.loginAs("admin_foe");
    cy.openEvent("QA FOE · Partida cancelada");
    modalButton("Reactivar partida").click();

    cy.expectToast("Partida reactivada.");
    cy.get(MODAL).contains(/^\s*CANCELADA/).should("not.exist");
    modalButton("Cancelar partida").should("be.visible");
  });

  it("TC-B07 Eliminar una partida pide confirmación y la borra del servidor", () => {
    cy.loginAs("admin_mad");
    cy.openTab("Partidas");
    const card = "QA MAD · Partida a eliminar";
    cardButton(card, "Eliminar").click();
    // Primer clic solo muestra la confirmación; el botón pasa a "Cancelar".
    cardButton(card, "Cancelar").should("be.visible");
    cardButton(card, "Confirmar eliminar partida").click();

    cy.expectToast("Partida eliminada.");
    cy.contains("article.event-card", card).should("not.exist");
    // Tras recargar sigue sin estar: se borró en la base de datos, no solo en pantalla.
    cy.reload();
    cy.waitForQuietNetwork();
    cy.openTab("Partidas");
    eventCard("QA MAD · Partida próxima").should("be.visible");
    cy.contains("article.event-card", card).should("not.exist");
  });

  it("TC-B08 Una partida cerrada no se puede editar ni eliminar desde la lista", () => {
    cy.loginAs("admin_mad");
    cy.openTab("Partidas");
    const card = "QA MAD · Partida cerrada";
    cardButton(card, "Ver acta / Desbloquear").should("be.visible");
    eventCard(card).contains("button", exactly("Editar")).should("not.exist");
    eventCard(card).contains("button", exactly("Eliminar")).should("not.exist");
  });

  it("TC-B09 Un jugador no puede pedir el desbloqueo de un acta", () => {
    cy.loginAs("player_mad");
    cy.openEvent("QA MAD · Partida cerrada");
    modalText(LOCKED).should("be.visible");
    cy.get(MODAL).contains("button", exactly("Solicitar desbloqueo para editar")).should("not.exist");
  });

  it("TC-B10 Desbloquear un acta MAD: la pide su admin y la aprueba el super admin", () => {
    cy.loginAs("admin_mad");
    cy.openEvent("QA MAD · Partida cerrada");
    modalButton("Solicitar desbloqueo para editar").click();
    // Responsables MAD aparte de quien lo pide: solo el super admin.
    cy.expectToast("Solicitud enviada. Pendiente de aprobación por 1 responsable.");
    modalText("Solicitud de desbloqueo activa (iniciada por QA Admin MAD)").should("be.visible");
    modalText("Aprobaciones necesarias (0/1):").should("be.visible");

    cy.loginAs("superadmin");
    cy.openEvent("QA MAD · Partida cerrada");
    modalButton("Aceptar desbloqueo").click();
    cy.expectToast("Todos han aprobado. Partida desbloqueada.");
    cy.get(MODAL).contains(LOCKED).should("not.exist");
    modalButton("Editar partida").should("be.visible");
  });

  it("TC-B11 Desbloquear un acta FOE necesita a los otros dos responsables y se puede cancelar", () => {
    const title = "QA FOE · Partida pasada abierta";
    cy.loginAs("admin_foe");
    cy.openEvent(title);
    modalButton("Guardar asistencia y bloquear partida").click();
    cy.expectToast("Asistencia guardada y partida bloqueada.");
    modalButton("Solicitar desbloqueo para editar").click();
    // Responsables FOE aparte de admin_foe: super admin y QA Junta 2 (Junta Operativa).
    cy.expectToast("Solicitud enviada. Pendiente de aprobación por 2 responsables.");

    cy.loginAs("junta2");
    cy.openEvent(title);
    // Solo quien lo pidió (o el super admin) puede cancelar la solicitud.
    cy.get(MODAL).contains("button", exactly("Cancelar solicitud")).should("not.exist");
    modalButton("Aceptar desbloqueo").click();
    cy.expectToast("Tu aprobación ha quedado registrada.");
    modalText("Aprobaciones necesarias (1/2):").should("be.visible");
    modalText(LOCKED).should("be.visible");

    cy.loginAs("admin_foe");
    cy.openEvent(title);
    modalButton("Cancelar solicitud").click();
    cy.expectToast("Solicitud de desbloqueo cancelada.");
    modalButton("Solicitar desbloqueo para editar").should("be.visible");
    modalText(LOCKED).should("be.visible");
  });
});
