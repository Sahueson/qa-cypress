# qa-cypress

**Cypress 16** (TypeScript) contra **Tactical Calendar** (staging), con los mismos 70 casos y
nombres que [qa-playwright](https://github.com/Sahueson/qa-playwright) y qa-selenium (Java y
Python), para comparar herramientas caso a caso. Forma parte de Ivan QA Lab: la web lanza cada
suite en GitHub Actions y muestra resultados y capturas.

```
cypress/e2e/<suite>/*.cy.ts    9 suites (a-auth … i-normas), 70 tests
cypress/support/e2e.ts         comandos: loginAs, openEvent, waitForQuietNetwork, expectToast…
cypress/support/app.ts         localizadores (fichas de jugador, votaciones, excedencias…)
cypress.config.ts              reset por suite (cy.task), JPEG por test, result.json común
run.sh                         SUITE=a-auth[,b-eventos] GREP='regex de títulos' ./run.sh
```

## Lo propio de Cypress frente a Playwright y Selenium

- **Corre dentro del navegador**: las órdenes se encadenan y Cypress reintenta cada aserción
  hasta 10 s (`should`), sin `await`.
- **Esperar a la red**: se inyecta el mismo contador de `fetch` que en Selenium, pero con
  `window:before:load`, sin CDP.
- **TC-D05** (carrera de la recarga): `cy.intercept` + `res.setDelay(1500)` retrasa la respuesta.
- **TC-I02**: la `apikey` se lee de las cabeceras de la propia petición con `cy.intercept`.
- **Subir PDF**: `selectFile` con el contenido en memoria. La app rellena el título con el
  nombre del fichero, así que se sube con el título como nombre.
- **Secretos**: Cypress 16 separa `cy.env()` (secretos, como la contraseña QA) de
  `Cypress.expose()` (valores públicos, como el filtro de tests).
- Las capturas de Cypress son PNG; se convierten a JPEG (calidad 60) para que pesen como las
  del resto. Nunca se publican vídeos ni logs.

## Ejecutar en local

```bash
ln -s ../ivan-qa-lab-shared shared   # en CI se clona
npm ci
set -a; . ~/.qa-lab.env; set +a
export BASE_URL=https://tactical-calendar-demo.vercel.app   # el demo, nunca PROD
SUITE=a-auth ./run.sh
SUITE=a-auth,i-normas GREP='^TC-A02 |^TC-I02 ' ./run.sh
```
