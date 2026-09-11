'use strict';

const path = require('path');
const { staticRoot } = require('../../../core/static-root');

// Bug real encontrado en fase-06 (limpieza de public/): esta ruta servia
// el mobile.html VIEJO leyendo directo de public/ con sendFile, ignorando
// por completo el sombreado de interfaz/dist que core/app.js aplica para
// la URL estatica /mobile.html. Como /mobile (sin .html) es la URL real
// que el QR / boton "copiar URL" le dan al telefono (ver
// interfaz/src/vistas/principal/mobile-remote.js), la descomposicion a
// modulos ESM de fase-04 nunca habia llegado a un telefono real — solo a
// quien entrara a /mobile.html a mano.
//
// La raiz (interfaz/dist en dev, <resources>/public en empaquetado) sale
// del helper compartido con core/app.js — core/static-root.js.
function mobilePage() {
  return (_req, res) => {
    res.sendFile(path.join(staticRoot(), 'mobile.html'));
  };
}

module.exports = { mobilePage };
