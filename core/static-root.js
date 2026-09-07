'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('./paths');

/**
 * Raiz estatica de la UI (output de `vite build`). Vive en dos lugares segun
 * el modo:
 *   - dev / `node server.js` / tests: RESOURCE_BASE/interfaz/dist
 *     (RESOURCE_BASE = raiz del repo, interfaz/ viaja completa)
 *   - empaquetado NSIS: interfaz/ NO esta en `files` de package.json, no entra
 *     al asar; extraResources copia interfaz/dist/ a <resources>/public/, y
 *     RESOURCE_BASE = process.resourcesPath (lo setea main.js en packaged).
 *
 * Mismo criterio que features/movil/routes/mobile-page.js — este helper es la
 * unica fuente de verdad para las dos, no volver a duplicar la logica en cada
 * call site (asi nacio el bug de "Cannot GET /" en el paquete: la fase-06
 * arreglo el fallback en mobile-page.js y se olvido de core/app.js).
 *
 * `base` es un seam de test (default RESOURCE_BASE): permite simular cualquiera
 * de los dos layouts sin pelear con el require-cache de core/paths.js. No cachea
 * a proposito — se llama 1 vez por createApp() y 1 vez por hit de /mobile
 * (baja frecuencia); cachear el fs.existsSync reintroduce el mismo problema de
 * test que ya tiene core/paths.js.
 */
function staticRoot(base = RESOURCE_BASE) {
  const devRoot = path.join(base, 'interfaz', 'dist');
  if (fs.existsSync(devRoot)) return devRoot;
  return path.join(base, 'public');
}

module.exports = { staticRoot };
