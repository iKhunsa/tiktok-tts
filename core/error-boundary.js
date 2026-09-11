'use strict';

/**
 * wrap(handler) para rutas Express: captura excepciones sincronas y promesas
 * rechazadas, loguea core.boundary.excepcion_capturada y responde 500
 * generico al cliente (nunca el stack crudo).
 */
function wrap(logger, domain, fn, handler) {
  return function wrapped(req, res, next) {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch((error) => handleRouteError(logger, domain, fn, req, res, error));
      }
    } catch (error) {
      handleRouteError(logger, domain, fn, req, res, error);
    }
  };
}

function handleRouteError(logger, domain, fn, req, res, error) {
  logger.log(
    'error',
    domain,
    fn,
    'core.boundary.excepcion_capturada',
    `Excepcion no manejada en ${fn}: ${error.message}`,
    { domain, function: fn, route: req && req.originalUrl, error: error.message, stack: error.stack }
  );
  if (res && !res.headersSent) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * wrap para listeners de bus cuando un dominio quiere reportar la excepcion
 * bajo su propio nombre de funcion (mas especifico que el generico
 * core.bus.listener_fallido que ya aplica el event-bus a todo listener).
 */
function wrapListener(logger, domain, fn, event, handler) {
  return function wrapped(payload) {
    try {
      handler(payload);
    } catch (error) {
      logger.log(
        'error',
        domain,
        fn,
        'core.boundary.excepcion_capturada',
        `Excepcion no manejada en ${fn} al procesar ${event}: ${error.message}`,
        { domain, function: fn, event, error: error.message, stack: error.stack }
      );
    }
  };
}

module.exports = { wrap, wrapListener };
