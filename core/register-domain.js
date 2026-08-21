'use strict';

const { trackForShutdown } = require('./shutdown');

/**
 * Monta un dominio dentro de su propio try/catch: si domainIndex.register()
 * lanza, se loguea core.dominio.fallo_montaje y el resto de los dominios
 * sigue vivo (aislamiento de fallos, contrato #4 de arquitectura-propuesta.md).
 */
function registerDomain(deps, domainIndex) {
  const { logger } = deps;
  const domain = domainIndex.name;

  try {
    const result = domainIndex.register(deps) || {};
    logger.log(
      'info',
      domain,
      `${domain}/index.js#register`,
      'core.dominio.montado',
      `Dominio ${domain} montado correctamente`,
      { domain, rutas: result.rutas || 0, listeners: result.listeners || 0 }
    );

    if (typeof domainIndex.shutdown === 'function') {
      trackForShutdown(domain, domainIndex.shutdown);
    }

    return true;
  } catch (error) {
    logger.log(
      'fatal',
      domain,
      `${domain}/index.js#register`,
      'core.dominio.fallo_montaje',
      `Dominio ${domain} fallo al montar: ${error.message}`,
      { domain, error: error.message, stack: error.stack }
    );
    return false;
  }
}

module.exports = { registerDomain };
