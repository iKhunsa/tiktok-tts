'use strict';

// Conexiones y desconexiones de chat. El backend viejo escuchaba
// 'platform:connected'/'disconnected'/'reconnect-failed'; /canales (Fase 6)
// no emite esos nombres — publica canal:estado con {platform, channel, state}
// generico para las 3 plataformas + OBS. Se adapta el conector a ese evento
// en vez de pedirle a /canales que hable el vocabulario viejo de telemetria.
function attach(bus, track, { markPlatform }) {
  bus.on('canal:estado', (payload) => {
    if (!payload || !['tiktok', 'twitch', 'youtube'].includes(payload.platform)) return;
    if (payload.state === 'conectado') {
      markPlatform(payload.platform);
      track('platforms', 'connected', { platform: payload.platform });
    } else if (payload.state === 'desconectado') {
      track('platforms', 'disconnected', { platform: payload.platform });
    }
  });
}

module.exports = { name: 'platforms', attach };
