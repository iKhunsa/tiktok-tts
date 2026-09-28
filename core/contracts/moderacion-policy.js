'use strict';

/**
 * @typedef {object} ModeracionVeredicto
 * @property {'allow'|'mute'|'drop'} action
 * @property {string[]} reasons
 * @property {object|null} message
 */

/**
 * Interfaz del contrato sincrono inyectado de /moderacion. /chat depende
 * de este veredicto ANTES de decidir TTS/overlay. Implementado de verdad
 * en la Fase 5 — hasta entonces, llamarlo lanza.
 * @param {object} msg
 * @returns {ModeracionVeredicto}
 */
function review(msg) {
  throw new Error('moderacionPolicy.review no implementado todavia (se implementa en la Fase 5 — /moderacion)');
}

module.exports = { review };
