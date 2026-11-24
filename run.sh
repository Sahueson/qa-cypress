#!/usr/bin/env bash
# Ejecuta una o varias suites (carpetas de cypress/e2e/), opcionalmente solo algunos tests, con el
# staging reservado (with-staging.js reserva + resetea; cada spec resetea al empezar).
#   SUITE=a-auth[,b-eventos]  GREP='TC-A01 Jugador…|TC-B02 …' (opcional, regex de títulos)  ./run.sh
# SUITE y GREP llegan de la web: SUITE se limpia a caracteres de slug y GREP viaja como variable
# de entorno (cypress.config.ts lo expone a los tests), nunca se interpola en el shell.
set -euo pipefail
cd "$(dirname "$0")"
suites=$(printf %s "${SUITE:?Falta SUITE}" | tr -cd 'a-z0-9,-')
specs=""
IFS=',' read -ra list <<< "$suites"
for s in "${list[@]}"; do [ -n "$s" ] && specs="${specs:+$specs,}cypress/e2e/$s/**/*.cy.ts"; done
rm -rf evidence cypress/screenshots result.json report allure-results
# El informe de Allure se genera luego con los resultados de allure-results (ver el workflow).
exec node shared/reset-staging/with-staging.js -- npx cypress run --spec "$specs"
