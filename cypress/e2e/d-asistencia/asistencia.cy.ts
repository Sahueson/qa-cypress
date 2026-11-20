import { MODAL, attendanceOf, eventCard, modalButton } from "../../support/app";

// Suite D · Motor de asistencia (Art. 33 y 34). Mismos casos que qa-playwright/tests/d-asistencia.
// El % se calcula sobre las partidas computables FOE del año (seed: finalizada 1, pasada abierta 1
// y MilSim pasada 1,5 = 3,5).

const regCheckbox = (nickname: string) =>
  cy.get(`${MODAL} .event-detail__reg-row`).filter(`:contains("${nickname}")`).find('input[type="checkbox"]');

describe("Suite D · Asistencia", () => {
  before(() => cy.task("resetStaging")); // otras suites alteran ese total

  it("TC-D01 El % anual se calcula sobre las partidas ya jugadas", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Jugadores");
    attendanceOf("QA Jugador FOE") // asistió a 1 de 3,5
      .should("contain.text", "29% (1/3,5)")
      .and("contain.text", "Por debajo del mínimo anual FOE (60% · Art. 33)");
  });

  it("TC-D02 Una MilSim pesa x1,5 en la asistencia", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Jugadores");
    // junta2 solo fue a la MilSim pasada: suma 1,5, no 1.
    attendanceOf("QA Junta 2").should("contain.text", "(1,5/");
  });

  it("TC-D03 Las partidas durante una excedencia aprobada no restan", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Jugadores");
    // Sin la excedencia serían 1,5/3,5 = 43 %; con ella la pasada abierta no computa.
    attendanceOf("QA Junta 2")
      .should("contain.text", "60% (1,5/2,5)")
      .and("contain.text", "Cumple mínimo anual FOE (60%)");
  });

  it("TC-D04 Cerrar el acta con asistencia actualiza el % del jugador", () => {
    cy.loginAs("admin_foe");
    cy.openEvent("QA FOE · Partida pasada abierta");
    regCheckbox("QA Jugador FOE").check();
    regCheckbox("QA Jugador FOE").should("be.checked"); // sigue marcada al guardar
    modalButton("Guardar asistencia y bloquear partida").click();
    cy.expectToast("Asistencia guardada y partida bloqueada.");
    modalButton("Cerrar").click();

    cy.openTab("Jugadores");
    attendanceOf("QA Jugador FOE").should("contain.text", "57% (2/3,5)");
  });

  // Regresión del bug (c), corregido en bfdc0e2: al abrir el detalle la app recarga los datos y esa
  // recarga reiniciaba el borrador de asistencia, borrando lo ya marcado. Con cy.intercept se
  // retrasa 1,5 s la respuesta de la recarga para que llegue SIEMPRE después de la marca.
  it("TC-D05 Una marca hecha nada más abrir la partida no se pierde con la recarga", () => {
    cy.loginAs("junta2");
    cy.openTab("Partidas");
    // Momento en que la respuesta retrasada llega de verdad a la app (no cuando la recibe Cypress).
    let deliveredAt = Number.POSITIVE_INFINITY;
    cy.intercept({ method: "GET", url: /\/rest\/v1\/event_registrations/ }, (req) => {
      req.on("response", (res) => {
        res.setDelay(1_500);
        deliveredAt = Date.now() + 1_500;
      });
    }).as("recarga");

    eventCard("QA FOE · Partida finalizada").find(".tactical-btn--blue").click();
    // El borrador se rellena justo después de pintar el modal (en el primer instante sale vacío).
    regCheckbox("QA Admin FOE").should("be.checked").uncheck();
    cy.wrap(null).then(() => expect(Date.now(), "la marca va antes de que llegue la recarga").to.be.lessThan(deliveredAt));

    cy.wait("@recarga");
    cy.waitForQuietNetwork();
    regCheckbox("QA Admin FOE").should("not.be.checked");
    modalButton("Guardar asistencia y bloquear partida").click();
    cy.expectToast("Asistencia guardada y partida bloqueada.");

    // Lo guardado en la base de datos, no solo en pantalla.
    cy.reload();
    cy.waitForQuietNetwork();
    cy.openTab("Jugadores");
    attendanceOf("QA Admin FOE").should("contain.text", "0% (0/3,5)");
  });
});
