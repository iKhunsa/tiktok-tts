'use strict';

const WINDOW_MS = 60 * 1000;

// Un log por operacion y por minuto: nunca silencioso, pero sin inundar si el
// motor falla en cada mensaje.
function createRateLimitedLog(logger, now = Date.now) {
  const lastLoggedAt = new Map();
  return function logFailure(operation, cause) {
    const current = now();
    if (current - (lastLoggedAt.get(operation) ?? -Infinity) < WINDOW_MS) return;
    lastLoggedAt.set(operation, current);
    logger.log('error', 'moderacion', 'rust-guard/create-rust-guard.js', 'moderacion.rust.fallo_evaluacion',
      `Rust Chat Guard fallo en ${operation}; se conserva el veredicto del guard JS`, { operation, cause });
  };
}

module.exports = { createRateLimitedLog };
