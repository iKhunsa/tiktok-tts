'use strict';

const registered = [];

function trackForShutdown(domain, shutdownFn) {
  registered.push({ domain, shutdown: shutdownFn });
}

/**
 * Recorre los dominios registrados en orden inverso de registro y llama
 * domain.shutdown() de cada uno en su propio try/catch: uno que falle no
 * bloquea el shutdown de los demas.
 */
async function shutdownAll(logger) {
  for (let i = registered.length - 1; i >= 0; i--) {
    const { domain, shutdown } = registered[i];
    try {
      await shutdown();
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
