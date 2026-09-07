'use strict';

const { extractYoutubeVideoId } = require('./extract-youtube-video-id');
const { isYoutubePlaylistUrl } = require('./is-youtube-playlist-url');
const { patchConfig, getConfigSnapshot } = require('../config-bridge');
const { musicBroadcastState } = require('./broadcast-state');
const { advanceMusicQueue } = require('./advance-queue');

async function resolveAndSavePlaylist(deps, lines) {
  const { musicState, bus, engine, logger } = deps;
  const streamerPlaylist = (lines || []).filter((l) => l && l.trim());
  patchConfig(bus, { streamerPlaylist });

  // Pre-resuelve lo que se puede rapido: videoId de URLs sueltas y expansion
  // de URLs de playlist (--flat-playlist). Los nombres de texto quedan sin
  // resolver (videoId:null) -> busqueda perezosa al reproducir.
  const resolved = [];
  for (const raw of streamerPlaylist) {
    const trimmed = raw.trim();

    if (isYoutubePlaylistUrl(trimmed)) {
      try {
        const items = await engine.expandPlaylist(trimmed);
        if (items.length) {
          resolved.push(...items);
          logger.log(
            'info', 'sonido', 'sonido/musica/resolve-and-save-playlist.js#resolveAndSavePlaylist', 'sonido.musica.playlist_expandida',
            `Playlist de YouTube expandida: ${items.length} videos`, { url: trimmed, count: items.length }
          );
          continue;
        }
      } catch (error) {
        logger.log(
          'warn', 'sonido', 'sonido/musica/resolve-and-save-playlist.js#resolveAndSavePlaylist', 'sonido.musica.playlist_expand_fallo',
          `No se pudo expandir la playlist ${trimmed}: ${error.message}`, { url: trimmed, error: error.message }
        );
      }
      // Expansion fallo o vino vacia -> guardar la URL cruda igual (mejor que
      // descartarla en silencio; se reintenta al reproducir).
      resolved.push({ raw, videoId: null });
      continue;
    }

    const ytId = extractYoutubeVideoId(trimmed);
    resolved.push(ytId
      ? { raw, videoId: ytId, title: raw, channelName: '', thumbnail: '', duration: '' }
      : { raw, videoId: null });
  }

  musicState.playlistResolved = resolved;
  musicState.playlistIndex = 0;

  bus.emit('ws:broadcast', { type: 'music-playlist-update', playlist: musicState.playlistResolved, index: musicState.playlistIndex });

  // Si la playlist ya estaba activada pero no habia nada sonando (se guardo
  // despues de prender el toggle, o estaba vacia), arrancarla ahora. Sin
  // esto el toggle "Activar" queda encendido y en silencio hasta el proximo !p.
  const config = getConfigSnapshot(bus);
  if (config.playlistEnabled && !musicState.currentTrack && musicState.playlistResolved.length > 0) {
    advanceMusicQueue(deps);
  }

  musicBroadcastState(deps);
}

module.exports = { resolveAndSavePlaylist };
