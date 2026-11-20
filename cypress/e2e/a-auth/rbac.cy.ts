import { exactly } from "../../support/e2e";

// Suite A · Visibilidad por rol (RBAC): lo que impone el RLS del staging, visto en la interfaz.
// Mismos casos que qa-playwright/tests/a-auth/rbac.spec.ts. Se comprueba qué se ve y qué no, sin
// contar el total, para que añadir partidas al seed no rompa estos tests.

const MAD = ["QA MAD · Partida próxima", "QA MAD · Partida en excedencia"];
const FOE = [
  "QA FOE · Partida próxima",
  "QA FOE · MilSim próxima",
  "QA FOE · Partida en menos de 48 h",
  "QA FOE · Partida finalizada",
  "QA FOE · Inscripción abierta",
];
const VOTACION_DIRECTIVA = "QA · Votación de la Junta Directiva";
const NAV = 'nav[aria-label="Navegación principal"]';

const expectSees = (titles: string[], expected: string[]) => {
  for (const t of expected) expect(titles.some((x) => x.includes(t)), `ve «${t}»`).to.be.true;
};

describe("Suite A · Visibilidad por rol", () => {
  before(() => cy.task("resetStaging"));

  it("TC-A06 Jugador MAD solo ve partidas MAD y no tiene pestaña FOE", () => {
    cy.loginAs("player_mad");
    cy.visibleEventTitles().then((titles) => {
      expectSees(titles, MAD);
      expect(titles.every((x) => x.includes("QA MAD")), "solo partidas MAD").to.be.true;
    });
    cy.get(NAV).contains("button", exactly("FOE · Votos y Faltas")).should("not.exist");
  });

  it("TC-A07 Jugador FOE ve las partidas FOE y ninguna MAD", () => {
    cy.loginAs("player_foe");
    cy.visibleEventTitles().then((titles) => {
      expectSees(titles, FOE);
      expect(titles.every((x) => x.includes("QA FOE")), "solo partidas FOE").to.be.true;
    });
    cy.get(NAV).contains("button", exactly("FOE · Votos y Faltas")).should("be.visible");
  });

  it("TC-A08 Super admin ve las partidas de ambos equipos", () => {
    cy.loginAs("superadmin");
    cy.visibleEventTitles().then((titles) => expectSees(titles, [...MAD, ...FOE]));
  });

  it("TC-A09 Jugador FOE sin cargo no ve la Junta Directiva", () => {
    cy.loginAs("player_foe");
    cy.openTab("FOE · Votos y Faltas");
    cy.contains("button", exactly("Faltas y Sanciones")).should("be.visible");
    cy.contains("button", exactly("Votos · Junta Directiva")).should("not.exist");
    cy.contains(VOTACION_DIRECTIVA).should("not.exist");
  });

  it("TC-A10 Miembro de la Junta Directiva ve su votación", () => {
    cy.loginAs("admin_foe");
    cy.openTab("FOE · Votos y Faltas");
    cy.contains("button", exactly("Votos · Junta Directiva")).click();
    cy.contains(VOTACION_DIRECTIVA).should("be.visible");
  });
});
