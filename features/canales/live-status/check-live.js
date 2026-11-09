'use strict';

const liveCheckContract = require('../../../core/contracts/live-check');
const { fetchKickChatroom } = require('../kick/fetch-chatroom');
const { parseYoutubeTarget } = require('../youtube/parse-target');
const { confirmYoutubeStillLive } = require('../youtube/connect-youtube');

// Texto del error de youtube-chat cuando la pagina del canal ya no tiene un
// directo activo. SOLO este cuenta como "offline confirmado": cualquier otro
// fallo (red caida, YouTube cambio la pagina, "client version was not found")
// es "no se", para no cortarle el en-vivo a un streamer por un problema nuestro.
const YOUTUBE_OFFLINE = 'live stream was not found';

const REALES = {
  twitchEnVivo: (login) => liveCheckContract.twitchEnVivo(login),
  kickEnVivo: async (slug) => (await fetchKickChatroom(slug)).isLive,
  youtubeEnVivo: async (key) => {
    const target = parseYoutubeTarget(key);
    if (!target) return null;
    const { alive, reason } = await confirmYoutubeStillLive(target);
    if (alive) return true;
    return String(reason || '').toLowerCase().includes(YOUTUBE_OFFLINE) ? false : null;
  },
};

/**
 * ¿Sigue en vivo `channel` en `platform`? -> true | false | null (no se sabe).
 * Nunca lanza: un fallo de la consulta es "no se", no "offline".
 * `deps` solo se inyecta en tests.
 */
async function checkLive(platform, channel, deps = REALES) {
  try {
    let r;
    if (platform === 'twitch') r = await deps.twitchEnVivo(channel);
    else if (platform === 'kick') r = await deps.kickEnVivo(channel);
    else if (platform === 'youtube') r = await deps.youtubeEnVivo(channel);
    else return null;
    return r === true || r === false ? r : null;
  } catch (_) {
    return null;
  }
}

module.exports = { checkLive };
