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
rm -rf evidence cypress/screenshots result.json report
# Informe HTML nativo (mochawesome): no lleva comandos ni contraseñas; aun así se pasa por mask-report.js antes de publicarse.
code=0
node shared/reset-staging/with-staging.js -- npx cypress run --spec "$specs"   --reporter mochawesome --reporter-options "reportDir=report/.jsons,overwrite=false,html=false,json=true" || code=$?
if ls report/.jsons/*.json >/dev/null 2>&1; then
  npx mochawesome-merge "report/.jsons/*.json" > report/merged.json     && npx marge report/merged.json -f index -o report --inline --reportTitle "Informe de Cypress" --reportPageTitle "Informe de Cypress" || true
  rm -rf report/.jsons report/merged.json
fi
exit $code
