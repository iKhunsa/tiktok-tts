'use strict';

const EventEmitter = require('events');

/**
 * EventEmitter de Node envuelto: unico canal de comunicacion entre dominios.
 * Todo handler registrado con on() se envuelve automaticamente para que una
 * excepcion dentro de un listener no interrumpa a los demas listeners del
 * mismo evento ni al emisor.
 */
function createEventBus(logger) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  function emit(event, payload) {
    emitter.emit(event, payload);
  }

  function logListenerError(domain, event, error, asyncLabel) {
    logger.log(
      'error',
      'core',
      'core/event-bus.js#on',
      'core.bus.listener_fallido',
      `Listener de ${domain} fallo${asyncLabel} al procesar el evento ${event}: ${error.message}`,
      { event, domainListener: domain, error: error.message, stack: error.stack }
    );
  }

  function on(event, handler, domain = 'desconocido') {
    emitter.on(event, (payload) => {
      try {
        const result = handler(payload);
        if (result && typeof result.catch === 'function') {
          result.catch((error) => logListenerError(domain, event, error, ' (async)'));
        }
      } catch (error) {
        logListenerError(domain, event, error, '');
      }
    });
  }

  return { emit, on };
}

module.exports = { createEventBus };
