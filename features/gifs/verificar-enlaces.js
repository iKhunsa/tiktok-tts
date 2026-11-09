'use strict';

const { descargar } = require('./descargar');
const { sniff } = require('./sniff');

const CADUCA_TRAS_MS = 24 * 60 * 60 * 1000;
const MAX_POR_PASADA = 12;

/**
 * Comprueba los GIFs guardados como enlace (los de archivo no caducan): marca 'caducado' los que ya no
 * existen o dejaron de ser animados. Un fallo pasajero (sin red, tiempo agotado, sitio que restringe) no
 * cambia el estado. Solo revisa los no verificados en las ultimas 24 h y como mucho 12 por pasada.
 */
async function verificarEnlaces({ store, logger }, { descargarFn = descargar, ahora = Date.now() } = {}) {
  const db = store.cargar(logger);
  const pendientes = db.items.filter((item) => item.modo === 'enlace' && ahora - (item.verificado || 0) > CADUCA_TRAS_MS).slice(0, MAX_POR_PASADA);
  for (const item of pendientes) {
    try {
      const { bytes } = await descargarFn(item.url);
      const info = sniff(bytes);
      item.estado = info && info.animado ? 'ok' : 'caducado';
      item.verificado = ahora;
    } catch (error) {
      if (error.codigo === 'enlace_caducado') { item.estado = 'caducado'; item.verificado = ahora; }
    }
  }
  if (pendientes.length) store.guardar(db);
  return pendientes.length;
}

module.exports = { verificarEnlaces };
