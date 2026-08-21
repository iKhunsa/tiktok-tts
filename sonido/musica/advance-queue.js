'use strict';

const { musicBroadcastState } = require('./broadcast-state');
const { resolveFullTrack } = require('./resolve-full-track');
const { getConfigSnapshot } = require('../config-bridge');

function advanceMusicQueue(deps) {
  const { musicState, bus } = deps;
  const config = getConfigSnapshot(bus);

  if (musicState.queue.length > 0) {
    musicState.playlistActive = false;
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
      musicState.currentTrack = { ...entry, requestedBy: null, platform: 'playlist' };
      bus.emit('ws:broadcast', { type: 'music-now-playing', track: musicState.currentTrack });
    } else {
      // Resolver perezosamente y luego reproducir.
      resolveFullTrack(deps, entry.raw).then((resolved) => {
        if (!resolved) { advanceMusicQueue(deps); return; }
        const idx = musicState.playlistResolved.indexOf(entry);
        if (idx !== -1) Object.assign(musicState.playlistResolved[idx], resolved);
        musicState.currentTrack = { ...resolved, requestedBy: null, platform: 'playlist' };
        bus.emit('ws:broadcast', { type: 'music-now-playing', track: musicState.currentTrack });
        musicBroadcastState(deps);
      }).catch(() => advanceMusicQueue(deps));
      return;
    }
  } else {
    musicState.currentTrack = null;
    bus.emit('ws:broadcast', { type: 'music-idle' });
  }
  musicBroadcastState(deps);
}

module.exports = { advanceMusicQueue };
