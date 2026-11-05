'use strict';

const { upcomingTracks } = require('./upcoming');

// Cuantas canciones de la cola se dejan descargadas por adelantado.
const PRECARGA = 3;
// Mezclas de una hora pesan cientos de MB: esas siguen por stream en vivo.
const MAX_SEGUNDOS = 15 * 60;

// Un overlay con video pidio /api/music/video hace menos de esto: tambien se bajan los videos.
const VIDEO_VIGENTE_MS = 10 * 60 * 1000;

const segundosDe = (duracion) => String(duracion || '').split(':').reduce((total, parte) => total * 60 + (Number(parte) || 0), 0);

/**
 * Descarga a disco la cancion actual y las siguientes (cola del chat y playlist), de una en
 * una para no competir con la que suena. Asi al avanzar la cola el stream
 * sale del archivo al instante en vez de esperar a yt-dlp. Si algun overlay
 * muestra video, despues del audio de cada tema baja tambien su video.
 */
function createPrefetcher(deps) {
  const { musicState, engine, logger } = deps;
  const fallidas = new Set();
  let ocupado = false;

  const conVideo = () => Date.now() - (musicState.videoWantedAt || 0) < VIDEO_VIGENTE_MS;
  const enCache = { audio: (id) => engine.cachedAudio(id), video: (id) => engine.cachedVideo(id) };

  // Siguiente descarga { medio, videoId }: por tema, primero el audio (lo que suena) y despues el video.
  const pendiente = () => [musicState.currentTrack, ...upcomingTracks(deps, PRECARGA)]
    .filter((track) => track?.videoId && segundosDe(track.duration) <= MAX_SEGUNDOS)
    .flatMap(({ videoId }) => (conVideo() ? ['audio', 'video'] : ['audio']).map((medio) => ({ medio, videoId })))
    .find(({ medio, videoId }) => !fallidas.has(`${medio}:${videoId}`) && !enCache[medio](videoId));

  return async function precargar() {
    if (ocupado) return;
    const siguiente = pendiente();
    if (!siguiente) return;
    const { medio, videoId } = siguiente;
    ocupado = true;
    try {
      await (medio === 'video' ? engine.downloadVideo(videoId) : engine.downloadAudio(videoId));
      logger.log('debug', 'sonido', 'sonido/musica/prefetch.js#precargar', 'sonido.musica.precarga_lista',
        `Precargado ${medio} de ${videoId}`, { videoId, medio });
    } catch (error) {
      fallidas.add(`${medio}:${videoId}`); // no reintentar en bucle: el audio sigue por stream en vivo; sin video, portada
      logger.log('warn', 'sonido', 'sonido/musica/prefetch.js#precargar', 'sonido.musica.precarga_fallida',
        `No se pudo precargar ${medio} de ${videoId}: ${error.message}`, { videoId, medio, error: error.message.slice(-300) });
    } finally {
      ocupado = false;
    }
    precargar();
  };
}

module.exports = { createPrefetcher };
