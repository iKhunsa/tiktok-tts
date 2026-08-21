'use strict';

// Errores de la app. Escucha error:handled/error:uncaught, ya emitidos por
// core/logger.js y core/error-boundary.js desde la Fase 1 — coincide 1:1
// con el nombre de evento del backend viejo, sin necesidad de bridge.

const MAX_PER_SESSION = 50;

function attach(bus, track) {
  let sent = 0;

  const report = (kind) => (payload) => {
    const { domain, message, stack } = payload || {};
    if (sent >= MAX_PER_SESSION || !message) return;
    sent++;
    track('errors', kind, {
      where: String(domain || 'unknown').slice(0, 120),
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 500) : null,
    });
  };

  bus.on('error:handled', report('handled'));
  bus.on('error:uncaught', report('uncaught'));
}

module.exports = { name: 'errors', attach };
