'use strict';

const MUSIC_DEDUP_WINDOW_MS = 3000;

function createMusicState() {
  return {
    queue: [], // [{ videoId, title, channelName, thumbnail, duration, requestedBy, platform }]
    currentTrack: null,
    userLastRequest: {}, // { userId: timestamp }
    recentCommands: new Map(), // `${userId}::${query}` -> timestamp, dedup fijo
    playlistResolved: [],
    playlistIndex: 0,
    playlistActive: false,
    playlistResolveFails: 0, // fallos consecutivos de resolucion perezosa en el ciclo actual de advance
  };
}

module.exports = { createMusicState, MUSIC_DEDUP_WINDOW_MS };
