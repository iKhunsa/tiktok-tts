'use strict';

/** Espejo de solo lectura del estado del desktop, sincronizado via state-sync. */
function createMobileState() {
  return {
    ttsGlobalEnabled: true,
    ttsPaused: false,
    streamTimerRunning: false,
    options: {
      readChat: true, readGifts: true, readGiftAmount: true, readJoins: true,
      readFollows: true, readLikes: true, readShares: true, sayUsername: true,
    },
    clips: [],
    soundPads: [],
    music: {
      enabled: true,
      current: null,
      queueLength: 0,
      volume: 0.5,
      playlistEnabled: false,
      playlistActive: false,
      playlistIndex: 0,
      playlistTotal: 0,
    },
  };
}

module.exports = { createMobileState };
