'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');

// Bug real encontrado en fase-06 (limpieza de public/): esta ruta servia
// el mobile.html VIEJO leyendo directo de public/ con sendFile, ignorando
// por completo el sombreado de interfaz/dist que core/app.js aplica para
// la URL estatica /mobile.html. Como /mobile (sin .html) es la URL real
// que el QR / boton "copiar URL" le dan al telefono (ver
// interfaz/src/vistas/principal/mobile-remote.js), la descomposicion a
// modulos ESM de fase-04 nunca habia llegado a un telefono real — solo a
// quien entrara a /mobile.html a mano.
//
// Misma logica de sombreado que core/app.js: en dev, `interfaz/` viaja
// completa (RESOURCE_BASE = raiz del repo) y el build de Vite vive en
// interfaz/dist/; en empaquetado, `interfaz/` fuente NO viaja (no esta en
// `files` de package.json) — extraResources copia interfaz/dist/ dentro
// de resources/public, asi que ahi es donde vive en produccion.
function resolveMobileHtml() {
  const devPath = path.join(RESOURCE_BASE, 'interfaz', 'dist', 'mobile.html');
  if (fs.existsSync(devPath)) return devPath;
  return path.join(RESOURCE_BASE, 'public', 'mobile.html');
}

function mobilePage() {
  return (_req, res) => {
    res.sendFile(resolveMobileHtml());
  };
}

module.exports = { mobilePage };
