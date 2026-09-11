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
 * Llama domain.shutdown() de todos los dominios registrados EN PARALELO,
 * cada uno en su propio try/catch con un timeout: uno que falle o cuelgue
 * no bloquea el shutdown de los demas. El tiempo total queda acotado por
 * SHUTDOWN_TIMEOUT_MS (el mas lento) en vez de la suma de todos.
 */
async function shutdownAll(logger) {
  await Promise.allSettled(
    registered.map(async ({ domain, shutdown }) => {
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
    })
  );
}

module.exports = { trackForShutdown, shutdownAll };
