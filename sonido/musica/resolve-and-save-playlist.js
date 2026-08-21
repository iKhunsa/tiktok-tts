'use strict';

const { extractYoutubeVideoId } = require('./extract-youtube-video-id');
const { patchConfig } = require('../config-bridge');
const { musicBroadcastState } = require('./broadcast-state');

function resolveAndSavePlaylist(deps, lines) {
  const { musicState, bus } = deps;
  const streamerPlaylist = lines.filter((l) => l.trim());
  patchConfig(bus, { streamerPlaylist });

  // Pre-resuelve lo que se puede rapido (videoId de URLs), salta busquedas lentas.
  musicState.playlistResolved = streamerPlaylist.map((raw) => {
    const ytId = extractYoutubeVideoId(raw.trim());
    return ytId ? { raw, videoId: ytId, title: raw, channelName: '', thumbnail: '', duration: '' } : { raw, videoId: null };
  });
  musicState.playlistIndex = 0;

  bus.emit('ws:broadcast', { type: 'music-playlist-update', playlist: musicState.playlistResolved, index: musicState.playlistIndex });
  musicBroadcastState(deps);
}

module.exports = { resolveAndSavePlaylist };
