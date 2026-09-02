'use strict';

const { extractYoutubeVideoId } = require('./extract-youtube-video-id');

async function resolveYoutubeId(deps, query) {
  const { engine, logger } = deps;

  const ytId = extractYoutubeVideoId(query);
  if (ytId) return { videoId: ytId };

  if (/spotify\.com/.test(query)) {
    // Sin API key de Spotify no se puede resolver el titulo del track — se omite.
    return null;
  }

  try {
    return await engine.search(query);
  } catch (error) {
    logger.log(
      'warn', 'sonido', 'sonido/musica/resolve-youtube-id.js#resolveYoutubeId', 'sonido.musica.busqueda_fallida',
      `Busqueda de musica fallo: ${error.message}`, { error: error.message }
    );
    return null;
  }
}

module.exports = { resolveYoutubeId };
