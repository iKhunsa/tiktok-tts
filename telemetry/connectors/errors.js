'use strict';

// Errores de la app.
//
// Se recorta el stack y se limita el volumen: un bucle de error no puede
// convertirse en un ataque de denegacion contra el propio servidor.

const MAX_PER_SESSION = 50;

function attach(bus, track) {
  let sent = 0;

  const report = (kind) => ({ where, message, stack } = {}) => {
    if (sent >= MAX_PER_SESSION || !message) return;
    sent++;
    track('errors', kind, {
      where: String(where || 'unknown').slice(0, 120),
      message: String(message).slice(0, 500),
      stack: stack ? String(stack).slice(0, 500) : null,
    });
  };

  bus.on('error:handled', report('handled'));
  bus.on('error:uncaught', report('uncaught'));
}

module.exports = { name: 'errors', attach };
