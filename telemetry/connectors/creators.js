'use strict';

// Identidad de los canales. Aqui vive la regla de las 2 resoluciones.
//
// server.js emite:
//
//   bus.emit('creator:connected', {
//     platform, username,
//     resolve: async () => ({ display_name, avatar_url, follower_count })
//   })
//
// `resolve` es una funcion perezosa: solo se llama si toca gastar una de las
// dos resoluciones. Asi el coste de red vive aqui y no en la ruta de conexion.

function attach(bus, track, { creatorCache, markPlatform }) {
  bus.on('creator:connected', async ({ platform, username, resolve }) => {
    if (!platform || !username) return;
    markPlatform(platform);

    const cache = creatorCache();

    // Tercera conexion en adelante: cero llamadas de red.
    if (!cache.shouldResolve(platform, username)) {
      track('creators', 'seen', { platform, username });
      return;
    }

    let profile = null;
    try {
      profile = typeof resolve === 'function' ? await resolve() : null;
    } catch (_) {
      profile = null;
    }

    if (!profile) {
      // La resolucion fallo. El contador NO sube: se reintenta la proxima vez.
      // Se manda igualmente un `seen` para no perder el canal.
      track('creators', 'seen', { platform, username });
      return;
    }

    const resolveCount = cache.recordResolved(platform, username, profile);

    track('creators', 'identified', {
      platform,
      username,
      resolve_count: resolveCount,
      display_name: profile.display_name || null,
      avatar_url: profile.avatar_url || null,
      channel_url: profile.channel_url || null,
      follower_count: profile.follower_count || null,
    });
  });

  // Seguidores en cada latido. No cuesta una peticion: la app ya refresca este
  // numero cada 5 minutos para el overlay de seguidores.
  bus.on('creator:stats', ({ platform, username, follower_count }) => {
    if (!platform || !username || !follower_count) return;
    track('creators', 'stats', { platform, username, follower_count });
  });
}

module.exports = { name: 'creators', attach };
