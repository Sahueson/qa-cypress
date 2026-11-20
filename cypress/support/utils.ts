// Utilidades sin efectos (se pueden importar desde los specs sin volver a registrar comandos).

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Texto visible exacto (sin espacios sobrantes), para cy.contains. */
export const exactly = (text: string) => new RegExp(`^\\s*${escapeRegex(text)}\\s*$`);
