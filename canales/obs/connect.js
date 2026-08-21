'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');

function connectObs(deps, port, password) {
  const { state, bus, logger } = deps;
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => { if (!settled) { settled = true; fn(); } };
    let ws;

    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}`);
    } catch (err) {
      return reject(err);
    }

    const timeoutId = setTimeout(() => {
      settle(() => {
        try { ws.close(); } catch (_) { /* best-effort */ }
        reject(new Error('Timeout al conectar OBS (5s)'));
      });
    }, 5000);

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (parseErr) {
        logger.log(
          'debug', 'canales', 'canales/obs/connect.js#connectObs', 'canales.obs.mensaje_no_parseable',
          'Mensaje de OBS WebSocket no parseable', { rawPreview: raw.toString().slice(0, 200) }
        );
        return;
      }

      if (msg.op === 0) {
        // Hello — responder Identify (op 1)
        const d = { rpcVersion: 1 };
        const authChallenge = msg.d && msg.d.authentication;
        if (authChallenge && password) {
          const secret = crypto.createHash('sha256').update(password + authChallenge.salt).digest('base64');
          d.authentication = crypto.createHash('sha256').update(secret + authChallenge.challenge).digest('base64');
        }
        d.eventSubscriptions = 64; // OutputEvents bitmask — incluye StreamStateChanged
        ws.send(JSON.stringify({ op: 1, d }));
      } else if (msg.op === 2) {
        // Identified — conexion establecida
        clearTimeout(timeoutId);
        state.obs.ws = ws;
        state.obs.lastParams = { port, password };
        state.obs.reconnectAttempts = 0;
        if (state.obs.reconnectTimer) { clearTimeout(state.obs.reconnectTimer); state.obs.reconnectTimer = null; }
        logger.log(
          'info', 'canales', 'canales/obs/connect.js#connectObs', 'canales.obs.conectado',
          `OBS WebSocket conectado en puerto ${port}`, { host: '127.0.0.1', port }
        );
        bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'conectado', port });
        settle(() => resolve());
      } else if (msg.op === 5) {
        const { eventType, eventData } = msg.d || {};
        if (eventType === 'StreamStateChanged') {
          if (eventData && eventData.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
            bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'stream-iniciado' });
          } else if (eventData && eventData.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
            bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'stream-detenido' });
          }
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeoutId);
      settle(() => reject(err));
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);
      if (state.obs.ws === ws) {
        state.obs.ws = null;
        logger.log('info', 'canales', 'canales/obs/connect.js#connectObs', 'canales.obs.desconectado', 'OBS WebSocket desconectado', {});
        bus.emit('canal:estado', { platform: 'obs', channel: null, state: 'desconectado' });
        if (!state.obs.intentionalClose) {
          require('./schedule-reconnect').scheduleObsReconnect(deps);
        }
      }
      settle(() => reject(new Error('OBS cerró la conexión')));
    });
  });
}

module.exports = { connectObs };
