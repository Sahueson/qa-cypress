import { cardButton, playerCard } from "../../support/app";
import { exactly } from "../../support/utils";

// Suite G · Gestión de jugadores. Solo el super admin cambia rol, bloqueo, equipos y órganos FOE; el
// efecto se comprueba entrando con el jugador afectado. Mismos casos que qa-playwright/tests/g-jugadores.

const NAV = 'nav[aria-label="Navegación principal"]';
const ROLE_SELECT = 'select:has(option[value="super_admin"])';
const ADD_SQUAD_SELECT = 'select:has(option:contains("+ Añadir otro equipo"))';

describe("Suite G · Gestión de jugadores", () => {
  before(() => cy.task("resetStaging"));

  it("TC-G01 El super admin asciende a un jugador a admin y este gestiona partidas", () => {
    cy.loginAs("superadmin");
    cy.openTab("Jugadores");
    playerCard("QA Jugador MAD").find(ROLE_SELECT).select("admin");
    cy.expectToast("Ficha actualizada para QA Jugador MAD.");

    cy.loginAs("player_mad");
    cy.openTab("Partidas");
    cardButton("QA MAD · Partida próxima", "Editar").should("be.visible");
    cardButton("QA MAD · Partida próxima", "Eliminar").should("be.visible");
  });

  it("TC-G02 El super admin bloquea a un jugador y este pierde el acceso", () => {
    cy.loginAs("superadmin");
    cy.openTab("Jugadores");
    playerCard("QA Jugador FOE").contains("button", exactly("Bloquear")).click();
    cy.expectToast("Ficha actualizada para QA Jugador FOE.");
    playerCard("QA Jugador FOE").contains("button", exactly("Desbloquear")).should("be.visible");
    cy.contains("h2, h3, h4", /^\s*QA Jugador FOE\s+\[BLOQUEADO\]\s*$/).should("be.visible");

    cy.loginAs("player_foe");
    cy.contains("h1, h2, h3", exactly("Acceso denegado")).should("be.visible");
    cy.get(NAV).should("not.exist");
  });

  it("TC-G03 Asignar equipo a un jugador sin equipo le da acceso a ese equipo", () => {
    cy.loginAs("superadmin");
    cy.openTab("Jugadores");
    playerCard("QA Sin Equipo").contains(exactly("Sin equipo asignado")).should("be.visible");
    playerCard("QA Sin Equipo").find(ADD_SQUAD_SELECT).select("FOE");
    cy.expectToast("Ficha actualizada para QA Sin Equipo.");
    playerCard("QA Sin Equipo").find('[title="Quitar de FOE"]').should("be.visible");

    cy.loginAs("sinequipo");
    cy.get(NAV).should("be.visible");
    cy.get(NAV).contains("button", exactly("FOE · Votos y Faltas")).should("be.visible");
    cy.visibleEventTitles().then((titles) => {
      expect(titles.some((t) => t.includes("QA FOE · Partida próxima")), "ve partidas FOE").to.be.true;
      expect(titles.every((t) => !t.includes("QA MAD")), "no ve partidas MAD").to.be.true;
    });
  });

  it("TC-G04 Quitar la Junta Directiva a un miembro le oculta sus votaciones", () => {
    cy.loginAs("superadmin");
    cy.openTab("Jugadores");
    playerCard("QA Junta 2").contains("button", exactly("✓ Junta Directiva")).click();
    cy.expectToast("Ficha actualizada para QA Junta 2.");
    playerCard("QA Junta 2").contains("button", exactly("+ Junta Directiva")).should("be.visible");

    cy.loginAs("junta2");
    cy.openTab("FOE · Votos y Faltas");
    cy.contains("button", exactly("Votos · Junta Operativa")).should("be.visible");
    cy.contains("button", exactly("Votos · Junta Directiva")).should("not.exist");
  });

  it("TC-G05 Un admin que no es super admin no puede cambiar permisos", () => {
    cy.loginAs("admin_foe");
    cy.openTab("Jugadores");
    playerCard("QA Junta 2").should("be.visible");
    playerCard("QA Junta 2").find(ROLE_SELECT).should("not.exist");
    playerCard("QA Junta 2").contains("button", /^\s*(Bloquear|Desbloquear)\s*$/).should("not.exist");
    playerCard("QA Junta 2").find('[title="Quitar de FOE"]').should("not.exist");
    playerCard("QA Junta 2").contains("button", "Junta Operativa").should("be.disabled");
  });

  it("TC-G06 El super admin no puede cambiarse el rol ni bloquearse a sí mismo", () => {
    cy.loginAs("superadmin");
    cy.openTab("Jugadores");
    playerCard("QA Super Admin").should("be.visible");
    playerCard("QA Super Admin").find(ROLE_SELECT).should("not.exist");
    playerCard("QA Super Admin").contains("button", exactly("Bloquear")).should("not.exist");
  });

  it("TC-G07 Un admin de equipo solo ve a los jugadores de su equipo", () => {
    cy.loginAs("admin_mad");
    cy.openTab("Jugadores");
    playerCard("QA Jugador MAD").should("be.visible");
    for (const nick of ["QA Jugador FOE", "QA Admin FOE", "QA Sin Equipo"]) {
      playerCard(nick).should("not.exist");
    }
  });
});
