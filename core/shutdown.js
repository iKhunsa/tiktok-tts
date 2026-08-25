'use strict';

const registered = [];
const SHUTDOWN_TIMEOUT_MS = 5000;

function trackForShutdown(domain, shutdownFn) {
  registered.push({ domain, shutdown: shutdownFn });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout tras ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

/**
 * Recorre los dominios registrados en orden inverso de registro y llama
 * domain.shutdown() de cada uno en su propio try/catch con un timeout: uno
 * que falle o cuelgue no bloquea el shutdown de los demas.
 */
async function shutdownAll(logger) {
  for (let i = registered.length - 1; i >= 0; i--) {
    const { domain, shutdown } = registered[i];
    try {
      await withTimeout(Promise.resolve().then(shutdown), SHUTDOWN_TIMEOUT_MS);
    } catch (error) {
      logger.log(
        'error',
        domain,
        `${domain}#shutdown`,
        'core.dominio.fallo_apagado',
        `Dominio ${domain} fallo al apagarse: ${error.message}`,
        { domain, error: error.message, stack: error.stack }
      );
    }
  }
}

module.exports = { trackForShutdown, shutdownAll };
