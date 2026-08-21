'use strict';

const { resolveYoutubeId } = require('./resolve-youtube-id');

async function resolveFullTrack(deps, query) {
  const { engine, logger } = deps;
  const partial = await resolveYoutubeId(deps, query);
  if (!partial) return null;
  if (partial.title) return partial; // ya tiene metadata desde la busqueda

  try {
    const info = await engine.getInfo(partial.videoId);
    if (info) return info;
    return { videoId: partial.videoId, title: query, channelName: '', thumbnail: '', duration: '' };
  } catch (error) {
    logger.log(
      'warn', 'sonido', 'sonido/musica/resolve-full-track.js#resolveFullTrack', 'sonido.musica.info_fallida',
      `getInfo fallo para ${partial.videoId}: ${error.message}`, { videoId: partial.videoId, error: error.message }
    );
    return { videoId: partial.videoId, title: query, channelName: '', thumbnail: '', duration: '' };
  }
}

module.exports = { resolveFullTrack };
