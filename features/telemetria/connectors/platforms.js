'use strict';

// Conexiones y desconexiones de chat + senal "en vivo".
//
// El backend viejo escuchaba 'platform:connected'/'disconnected'/'reconnect-failed';
// /canales (Fase 6) no emite esos nombres — publica canal:estado con
// {platform, channel, state} generico para las 3 plataformas + OBS. Se adapta
// el conector a ese evento en vez de pedirle a /canales que hable el
// vocabulario viejo de telemetria.
//
// Ademas: mientras haya al menos un canal de chat conectado (el streamer esta
// transmitiendo), se emite app/live cada 60s. El panel usa esa senal — no el
// heartbeat de 5 min, que solo dice "el proceso esta abierto" — para el mapa
// y la tarjeta "en vivo ahora". Al quedarse sin canales se emite
// app/live_stopped y el punto del mapa envejece (backend: ventana de 150s).
const { flush } = require('../runtime');

const LIVE_PING_MS = 60 * 1000;
const PLATFORMS = ['tiktok', 'twitch', 'youtube'];

function attach(bus, track, { markPlatform }) {
  const liveChannels = new Set(); // `${platform}:${channel}`
  let liveTimer = null;

  function startLive() {
    if (liveTimer) return;
    track('app', 'live', {});
    flush();
    liveTimer = setInterval(() => {
      track('app', 'live', {});
      flush();
    }, LIVE_PING_MS);
    if (liveTimer.unref) liveTimer.unref();
  }

  function stopLive() {
    if (!liveTimer) return;
    clearInterval(liveTimer);
    liveTimer = null;
    track('app', 'live_stopped', {});
    flush();
  }

  bus.on('canal:estado', (payload) => {
    if (!payload || !PLATFORMS.includes(payload.platform)) return;

    if (payload.state === 'conectado') {
      markPlatform(payload.platform);
      track('platforms', 'connected', { platform: payload.platform });
      if (payload.channel) {
        liveChannels.add(`${payload.platform}:${payload.channel}`);
        startLive();
      }
    } else if (payload.state === 'desconectado') {
      track('platforms', 'disconnected', { platform: payload.platform });
      if (payload.channel) liveChannels.delete(`${payload.platform}:${payload.channel}`);
      if (liveChannels.size === 0) stopLive();
    } else if (payload.state === 'sin-canales') {
      liveChannels.clear();
      stopLive();
    }
    // 'reconectando' / 'error' se ignoran: son transitorios y la ventana de
    // 150s del backend absorbe el hueco hasta el proximo 'conectado' o el
    // 'desconectado'/'sin-canales' definitivo.
  });
}

module.exports = { name: 'platforms', attach };
