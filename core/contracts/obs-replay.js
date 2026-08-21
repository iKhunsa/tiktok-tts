'use strict';

/**
 * Interfaz del contrato sincrono inyectado por /canales (Fase 6) para que
 * /clips (Fase 11) sepa el resultado (exito/fallo) de guardar el replay sin
 * conocer el protocolo OBS WS. Analogo a moderacion-policy.js. Lanza si se
 * llama antes de que /canales se registre.
 */
function saveReplay() {
  throw new Error('obsReplay.saveReplay no implementado todavia (se implementa en la Fase 6 — /canales)');
}

module.exports = { saveReplay };
