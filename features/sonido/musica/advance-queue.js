'use strict';

const { musicBroadcastState } = require('./broadcast-state');
const { resolveFullTrack } = require('./resolve-full-track');
const { getConfigSnapshot } = require('../config-bridge');

const LAZY_RETRY_DELAY_MS = 500;

function advanceMusicQueue(deps) {
  const { musicState, bus, logger } = deps;
  musicState.playbackGen = (musicState.playbackGen || 0) + 1;
  const myGen = musicState.playbackGen;
  const config = getConfigSnapshot(bus);

  if (musicState.queue.length > 0) {
    musicState.playlistActive = false;
    musicState.playlistResolveFails = 0;
    musicState.currentTrack = musicState.queue.shift();
    bus.emit('ws:broadcast', { type: 'music-now-playing', track: musicState.currentTrack, queue: [...musicState.queue] });
  } else if (config.playlistEnabled && musicState.playlistResolved.length > 0) {
    musicState.playlistActive = true;
    if (config.playlistShuffle) {
      musicState.playlistIndex = Math.floor(Math.random() * musicState.playlistResolved.length);
    }
    const entry = musicState.playlistResolved[musicState.playlistIndex];
    if (!entry) {
      musicState.currentTrack = null;
      bus.emit('ws:broadcast', { type: 'music-idle' });
      musicBroadcastState(deps);
      return;
    }
    musicState.playlistIndex = (musicState.playlistIndex + 1) % musicState.playlistResolved.length;
    if (entry.videoId) {
      musicState.playlistResolveFails = 0;
      musicState.currentTrack = { ...entry, requestedBy: null, platform: 'playlist' };
      bus.emit('ws:broadcast', { type: 'music-now-playing', track: musicState.currentTrack });
    } else {
      // Resolver perezosamente y luego reproducir.
      resolveFullTrack(deps, entry.raw).then((resolved) => {
        if (musicState.playbackGen !== myGen) return; // esta resolucion quedo obsoleta (otra llamada a advanceMusicQueue ya decidio que suena ahora)
        if (!resolved) { salteoPerezoso(deps); return; }
        musicState.playlistResolveFails = 0;
        const idx = musicState.playlistResolved.indexOf(entry);
        if (idx !== -1) Object.assign(musicState.playlistResolved[idx], resolved);
        musicState.currentTrack = { ...resolved, requestedBy: null, platform: 'playlist' };
        bus.emit('ws:broadcast', { type: 'music-now-playing', track: musicState.currentTrack });
        musicBroadcastState(deps);
      }).catch((error) => {
        if (musicState.playbackGen !== myGen) return; // esta resolucion quedo obsoleta
        if (logger) logger.log(
          'warn', 'sonido', 'sonido/musica/advance-queue.js#advanceMusicQueue', 'sonido.musica.playlist_track_salteado',
          `Se salteó un tema de la playlist al no poder resolverlo: ${error.message}`, { error: error.message }
        );
        salteoPerezoso(deps);
      });
      return;
    }
  } else {
    musicState.currentTrack = null;
    bus.emit('ws:broadcast', { type: 'music-idle' });
  }
  musicBroadcastState(deps);
}

// Un fallo de resolucion perezosa de una entrada de la playlist. Si ya fallaron
// TODAS las entradas en este ciclo (playlist entera irresoluble: rate-limit de
// yt-dlp, offline, videoId muertos) frena en idle en vez de reintentar en loop
// infinito spawneando un yt-dlp por iteracion. Un exito de resolucion resetea
// el contador (vive en musicState).
function salteoPerezoso(deps) {
  const { musicState, bus } = deps;
  musicState.playlistResolveFails = (musicState.playlistResolveFails || 0) + 1;
  if (musicState.playlistResolveFails >= musicState.playlistResolved.length) {
    musicState.playlistResolveFails = 0;
    musicState.playlistActive = false;
    musicState.currentTrack = null;
    bus.emit('ws:broadcast', { type: 'music-idle' });
    musicBroadcastState(deps);
    return;
  }
  const delay = deps.lazyRetryDelayMs != null ? deps.lazyRetryDelayMs : LAZY_RETRY_DELAY_MS;
  setTimeout(() => advanceMusicQueue(deps), delay);
}

module.exports = { advanceMusicQueue };
