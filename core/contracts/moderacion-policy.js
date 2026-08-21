'use strict';

/**
 * @typedef {object} ModeracionVeredicto
 * @property {boolean} isSpam
 * @property {boolean} isMuted
 * @property {boolean} isBanned
 * @property {boolean} isFollower
 */

/**
 * Interfaz del contrato sincrono inyectado de /moderacion. /chat depende
 * de este veredicto ANTES de decidir TTS/overlay. Implementado de verdad
 * en la Fase 5 — hasta entonces, llamarlo lanza.
 * @param {object} msg
 * @returns {ModeracionVeredicto}
 */
function evaluate(msg) {
  throw new Error('moderacionPolicy.evaluate no implementado todavia (se implementa en la Fase 5 — /moderacion)');
}

module.exports = { evaluate };
