'use strict';

// Proveedores cuyos enlaces a medios son publicos y permanentes: de ellos se guarda solo la referencia
// (no se copia el archivo). Cualquier otro sitio se descarga, porque su enlace puede caducar o bloquearse.
const PROVEEDORES_PERSISTENTES = [
  /(^|\.)giphy\.com$/i,
  /(^|\.)tenor\.com$/i,
  /(^|\.)imgur\.com$/i,
];

function esEnlacePersistente(url) {
  try {
    const { hostname } = new URL(url);
    return PROVEEDORES_PERSISTENTES.some((patron) => patron.test(hostname));
  } catch (_) {
    return false;
  }
}

module.exports = { esEnlacePersistente };
