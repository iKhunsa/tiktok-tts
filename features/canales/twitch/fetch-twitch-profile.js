'use strict';

const { fetch: undiciFetch } = require('undici');

/**
 * Perfil publico de un canal de Twitch. Fixea el catch mas citado del
 * analisis (backend-viejo/server.js:2792): antes, si la API de Twitch
 * fallaba, el fallback era silencioso — ahora queda logueado con status
 * HTTP + error explicitos.
 */
async function fetchTwitchProfile(deps, login) {
  const { state, logger } = deps;
  try {
    const res = await undiciFetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      {
        headers: {
          Authorization: `Bearer ${state.authTokens.twitch.accessToken}`,
          'Client-Id': deps.twitchClientId,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) {
      logger.log(
        'warn', 'canales', 'canales/twitch/fetch-twitch-profile.js#fetchTwitchProfile', 'canales.twitch.perfil_fallido',
        `No se pudo obtener el perfil de Twitch de ${login}: HTTP ${res.status}`, { login, statusHttp: res.status }
      );
      return { display_name: login };
    }
    const user = (await res.json()).data?.[0];
    if (!user) return { display_name: login };

    let followers = null;
    try {
      const fr = await undiciFetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}&first=1`,
        {
          headers: {
            Authorization: `Bearer ${state.authTokens.twitch.accessToken}`,
            'Client-Id': deps.twitchClientId,
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (fr.ok) followers = (await fr.json()).total ?? null;
    } catch (_) { /* seguidores opcionales, requiere scope de moderacion */ }

    logger.log(
      'debug', 'canales', 'canales/twitch/fetch-twitch-profile.js#fetchTwitchProfile', 'canales.twitch.perfil_obtenido',
      `Perfil de Twitch obtenido para ${login}`, { login }
    );
    return {
      display_name: user.display_name || login,
      avatar_url: user.profile_image_url || null,
      follower_count: followers,
    };
  } catch (error) {
    logger.log(
      'warn', 'canales', 'canales/twitch/fetch-twitch-profile.js#fetchTwitchProfile', 'canales.twitch.perfil_fallido',
      `Excepcion obteniendo el perfil de Twitch de ${login}: ${error.message}`, { login, error: error.message }
    );
    return { display_name: login };
  }
}

module.exports = { fetchTwitchProfile };
