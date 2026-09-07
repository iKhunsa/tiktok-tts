'use strict';

const MOBILE_ALLOWED_ACTIONS = new Set([
  'toggle', 'globalTTS', 'pause', 'skip', 'clear', 'emergency', 'markClip', 'deleteClip', 'soloChat',
  'soundpadPlay',
  'musicSkip', 'musicToggle', 'musicVolume', 'playlistToggle',
]);

module.exports = { MOBILE_ALLOWED_ACTIONS };
