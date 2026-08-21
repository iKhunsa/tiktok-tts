'use strict';

/** Normalizacion previa a moderacion: minusculas + colapso de espacios. Las
 * 3 plataformas pasan el texto por aca ANTES de moderacionPolicy.evaluate(),
 * para que una palabra bloqueada se filtre igual sin importar la plataforma. */
function normalizeForModeration(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

module.exports = { normalizeForModeration };
