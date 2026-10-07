'use strict';

/**
 * Interfaz del contrato sincrono inyectado de /idioma (computo puro, sin
 * estado mutable compartido). /moderacion y /sonido lo consumen. Implementado
 * de verdad en la Fase 3 — hasta entonces, llamarlo lanza.
 * @param {object} msg
 * @returns {boolean}
 */
function filtrar(msg) {
  throw new Error('idioma.filtrar no implementado todavia (se implementa en la Fase 3 — /idioma)');
}

/**
 * ¿La palabra (minusculas) esta en algun diccionario de idioma? Sin proveedor
 * responde false (nada se reconoce), asi /moderacion arranca igual sin /idioma.
 * @param {string} word
 * @returns {boolean}
 */
function isKnownWord(word) {
  return false;
}

module.exports = { filtrar, isKnownWord };
