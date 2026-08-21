'use strict';

const { loadSounds } = require('./load-sounds');

/** /movil (Fase 8) refleja esto via bus.on('sonido:soundpads-actualizados') — nunca se toca mobileState directo. */
function syncSoundPadsToMobileState(deps) {
  const { bus, soundsConfigPath } = deps;
  const soundPads = loadSounds(soundsConfigPath).map((s) => ({ id: s.id, name: s.name, color: s.color }));
  bus.emit('sonido:soundpads-actualizados', soundPads);
  bus.emit('ws:broadcast', { type: 'state-sync', state: { soundPads } });
}

module.exports = { syncSoundPadsToMobileState };
