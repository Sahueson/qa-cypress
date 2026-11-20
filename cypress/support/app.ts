import { exactly } from "./utils";

// Localizadores de Tactical Calendar para Cypress (los mismos que el page object de qa-playwright).

export const MODAL = ".modal";

export const modalButton = (text: string) => cy.get(MODAL).contains("button", exactly(text));
export const modalText = (text: string) => cy.get(MODAL).contains(text);
export const eventCard = (title: string) => cy.contains("article.event-card", title);
export const cardButton = (title: string, text: string) => eventCard(title).contains("button", exactly(text));

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tarjeta más interna (.tactical-card sin otra dentro) con un encabezado que cumple `match`. */
const innermostCard = (match: (heading: string) => boolean) =>
  cy.get(".tactical-card").filter((_, el) =>
    el.querySelector(".tactical-card") === null &&
    [...el.querySelectorAll("h2, h3, h4")].some((h) => match((h.textContent ?? "").trim())));

/** Ficha de jugador: el título lleva " [BLOQUEADO]" o " (Tú)" según el caso. */
export const playerCard = (nickname: string) => {
  const re = new RegExp(`^${escapeRegex(nickname)}( \\[BLOQUEADO\\]| \\(Tú\\))?$`);
  return innermostCard((h) => re.test(h));
};

/** Bloque de asistencia de la ficha: "Asistencia 2026 · 60% (1,5/2,5)" + "Cumple mínimo...". */
export const attendanceOf = (nickname: string) =>
  playerCard(nickname).find(".roster-card__label").filter((_, el) => /^Asistencia \d{4}/.test(el.textContent ?? "")).parent();

/** Tarjeta de una votación por (parte de) su título. */
export const pollCard = (title: string) => innermostCard((h) => h.includes(title));

/** Fila de excedencias por su motivo: <fila><info><motivo/></info><botones/></fila>. */
export const leaveRow = (reason: string) => cy.contains(exactly(reason)).parent().parent();

export const openLeavesPanel = () => {
  cy.openTab("Jugadores");
  cy.contains("button", /^\s*Excedencias FOE/).click();
};

export const openFoeSection = (label: string) => {
  cy.openTab("FOE · Votos y Faltas");
  cy.contains("button", exactly(label)).click();
};

/** Formulario de inscripción del detalle de partida: equipación y rol. */
export const registrationSelect = (index: 0 | 1) => cy.get(`${MODAL} .inscribir-form select`).eq(index);

/** Fecha local YYYY-MM-DD dentro de `days` días (como <input type="date">). */
export const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
