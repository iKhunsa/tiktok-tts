'use strict';

// Canal en tiempo real de Twitch/Kick hacia servicio-cuentas (ver
// docs/plan-twitch-kick.md, FASE 3). Un WebSocket propio, separado del `ws`
// local de esta app: servicio-cuentas reenvia ahi los eventos de chat/subs/
// bits/kicks de las plataformas que el usuario tenga vinculadas.
//
// Se conecta/desconecta solo con el login (bus 'account:changed'; el token
// vive en estado-sesion.js, nunca en el renderer). Lo que llega se reenvia
// al bus local como 'ws:broadcast' (mismo canal que usa el resto de la app
// para hablarle al renderer, ver core/broadcast.js) bajo el tipo
// 'plataforma-evento' — no se guarda nada en disco ni en memoria mas alla de
// la conexion misma: si se cae, se reconecta y lo que paso mientras tanto
// se perdio (tal como lo dice el plan).

const WebSocket = require('ws');
const estado = require('./estado-sesion');

const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

function crearRealtime({ urlServicio, bus, logger }) {
  const wsUrl = urlServicio.replace(/^http/, 'ws');
  let socket = null;
  let intentos = 0;
  let detenido = true;
  let timerReconexion = null;

  function limpiarTimer() {
    if (timerReconexion) { clearTimeout(timerReconexion); timerReconexion = null; }
  }

  function reintentar() {
    limpiarTimer();
    const espera = BACKOFF_MS[Math.min(intentos, BACKOFF_MS.length - 1)];
    intentos += 1;
    timerReconexion = setTimeout(() => { if (!detenido) conectar(); }, espera);
    if (timerReconexion.unref) timerReconexion.unref();
  }

  function conectar() {
    const token = estado.getToken();
    if (!token) return;
    detenido = false;
    limpiarTimer();

    socket = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);

    socket.on('open', () => { intentos = 0; });

    socket.on('message', (raw) => {
      let evento;
      try { evento = JSON.parse(raw.toString()); } catch (_) { return; }
      bus.emit('ws:broadcast', { type: 'plataforma-evento', ...evento });
      bus.emit('plataforma:evento', evento); // version cruda para otros dominios (ver moderacion/index.js#gift-gate)
    });

    socket.on('close', () => {
      socket = null;
      if (!detenido) reintentar();
    });

    socket.on('error', (err) => {
      logger.log('warn', 'auth', 'auth/plataformas-realtime.js#conectar', 'auth.realtime.error',
        `WS de plataformas vinculadas con error: ${err.message}`, { error: err.message });
    });
  }

  function desconectar() {
    detenido = true;
    intentos = 0;
    limpiarTimer();
    if (socket) {
      try { socket.close(); } catch (_) { /* best-effort */ }
      socket = null;
    }
  }

  bus.on('account:changed', ({ current }) => {
    desconectar();
    if (current && current !== 'anonymous') conectar();
  }, 'auth');

  return { conectar, desconectar };
}

module.exports = { crearRealtime };
