'use strict';

// Version reducida respecto al backend viejo: el backend viejo emitia
// 'creator:connected' con una funcion resolve() que traia avatar/nombre/
// seguidores desde la propia conexion (server.js hacia el fetch inline al
// conectar). /canales (Fase 6) no volvio a implementar esa resolucion de
// perfil en el momento de conectar — canal:estado solo trae roomInfo crudo.
// Sin una fuente de perfil, este conector se reduce a marcar "visto" (cache
// de resolucion intacta para cuando /canales agregue esa resolucion).
function attach(bus, track, { creatorCache, markPlatform }) {
  bus.on('canal:estado', (payload) => {
    if (!payload || payload.state !== 'conectado' || !payload.channel) return;
    if (!['tiktok', 'twitch', 'youtube'].includes(payload.platform)) return;
    markPlatform(payload.platform);

    // creatorCache() devuelve null si telemetria no se inicializo (sin
    // TELEMETRY_URL, p.ej. en dev) — en ese caso no hay nada que resolver.
    const cache = creatorCache();
    if (!cache || !cache.shouldResolve(payload.platform, payload.channel)) return;
    track('creators', 'seen', { platform: payload.platform, username: payload.channel });
  });
}

module.exports = { name: 'creators', attach };
