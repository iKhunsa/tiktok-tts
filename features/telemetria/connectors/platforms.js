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
//
// Chat conectado NO es directo activo: en Twitch/Kick/YouTube el chat sigue
// conectado cuando el stream ya termino. /canales (live-status/live-monitor.js)
// confirma con la plataforma y emite `canal:live {platform, channel, live}`;
// un canal con veredicto offline deja de contar aunque siga "conectado". Sin
// veredicto (la consulta fallo o aun no respondio) cuenta como antes.
const { flush } = require('../runtime');

const LIVE_PING_MS = 60 * 1000;
const PLATFORMS = ['tiktok', 'twitch', 'youtube', 'kick'];

function attach(bus, track, { markPlatform }) {
  const liveChannels = new Set(); // `${platform}:${channel}`
  const offlineConfirmado = new Set(); // canales con veredicto "ya no esta en vivo"
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

  function stopLive({ flushNow = true } = {}) {
    if (!liveTimer) return;
    clearInterval(liveTimer);
    liveTimer = null;
    track('app', 'live_stopped', {});
    if (flushNow) flush();
  }

  // Al cerrar la app: cortar el live sin flush propio — runtime.shutdown()
  // hace el flush final y live_stopped viaja en el mismo batch que
  // app/shutdown (un flush aca dejaria transport.sending=true y el de
  // shutdown saldria sin enviar). Sin esto el backend espera la ventana de 150s.
  bus.on('telemetry:shutdown', () => stopLive({ flushNow: false }));

  bus.on('canal:estado', (payload) => {
    if (!payload || !PLATFORMS.includes(payload.platform)) return;

    if (payload.state === 'conectado') {
      markPlatform(payload.platform);
      track('platforms', 'connected', { platform: payload.platform });
      // Si el chat se reconecta (sin haberse dado de baja) y ya se confirmo que
      // el directo termino, no vuelve a contar solo por estar "conectado".
      if (payload.channel && !offlineConfirmado.has(`${payload.platform}:${payload.channel}`)) {
        liveChannels.add(`${payload.platform}:${payload.channel}`);
        startLive();
      }
    } else if (['desconectado', 'esperando-proximo-live', 'auth-requerida'].includes(payload.state)) {
      if (payload.state === 'desconectado') {
        track('platforms', 'disconnected', { platform: payload.platform });
      }
      if (payload.channel) {
        liveChannels.delete(`${payload.platform}:${payload.channel}`);
        offlineConfirmado.delete(`${payload.platform}:${payload.channel}`);
      }
      if (liveChannels.size === 0) stopLive();
    } else if (payload.state === 'sin-canales') {
      // Emitido solo por TikTok (cleanup-after-last-channel.js) — no tocar
      // los canales de otras plataformas que puedan seguir en vivo.
      const prefix = `${payload.platform}:`;
      for (const key of liveChannels) {
        if (key.startsWith(prefix)) liveChannels.delete(key);
      }
      for (const key of offlineConfirmado) {
        if (key.startsWith(prefix)) offlineConfirmado.delete(key);
      }
      if (liveChannels.size === 0) stopLive();
    }
    // 'reconectando' / 'error' se ignoran: son transitorios y la ventana de
    // 150s del backend absorbe el hueco hasta el proximo 'conectado' o el
    // 'desconectado'/'sin-canales' definitivo.
  });

  // Veredicto de /canales sobre si el directo sigue (Twitch/Kick/YouTube).
  // live=false: deja de contar (aunque el chat siga conectado) y, si era el
  // ultimo, corta app/live. live=true: vuelve a contar.
  bus.on('canal:live', (payload) => {
    if (!payload || !PLATFORMS.includes(payload.platform) || !payload.channel) return;
    const key = `${payload.platform}:${payload.channel}`;
    if (payload.live === true) {
      offlineConfirmado.delete(key);
      liveChannels.add(key);
      startLive();
    } else if (payload.live === false) {
      offlineConfirmado.add(key);
      liveChannels.delete(key);
      if (liveChannels.size === 0) stopLive();
    }
  });
}

module.exports = { name: 'platforms', attach };
