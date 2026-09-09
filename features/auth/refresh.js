'use strict';

const estado = require('./estado-sesion');

// Revalida la sesion contra servicio-cuentas: al arrancar y cada REFRESH_MS.
// Si el estado cambia, emite auth:actualizado + ws:broadcast.
// Si el servicio no responde -> estado.marcarDegradado() (TTL de gracia adentro).

const REFRESH_MS = 10 * 60 * 1000;

function crearRefresh({ cliente, bus, logger }) {
  async function tick() {
    const token = estado.getToken();
    if (!token) return;
    const antes = estado.getSesion();

    const r = await cliente.session(token);
    if (r.status === 401) {
      // token invalido/expirado -> cerrar sesion local
      estado.cerrar(logger);
      emitirCambio(antes, estado.getSesion());
      logger.log('info', 'auth', 'auth/refresh.js#tick', 'auth.sesion.expirada',
        'Token rechazado por servicio-cuentas, sesion cerrada', {});
      return;
    }
    if (!r.ok) {
      estado.marcarDegradado();
      logger.log('warn', 'auth', 'auth/refresh.js#tick', 'auth.servicio.sin_respuesta',
        'servicio-cuentas no respondio en el refresh', { status: r.status });
      emitirCambio(antes, estado.getSesion());
      return;
    }
    estado.aplicar({ session: r.body }, logger);
    emitirCambio(antes, estado.getSesion());
  }

  function emitirCambio(antes, ahora) {
    if (antes.signedIn === ahora.signedIn && antes.plan === ahora.plan && antes.degraded === ahora.degraded) return;
    bus.emit('auth:actualizado', { signedIn: ahora.signedIn, plan: ahora.plan });
    bus.emit('ws:broadcast', { type: 'auth-updated', session: estado.getSesionPublica() });
  }

  function start() {
    tick().catch((err) => logger.log('warn', 'auth', 'auth/refresh.js#start', 'auth.refresh.fallo', err.message, {}));
    const timer = setInterval(() => {
      tick().catch((err) => logger.log('warn', 'auth', 'auth/refresh.js#tick', 'auth.refresh.fallo', err.message, {}));
    }, REFRESH_MS);
    if (timer.unref) timer.unref();
    return timer;
  }

  return { start, tick, emitirCambio };
}

module.exports = { crearRefresh, REFRESH_MS };
