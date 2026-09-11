'use strict';

const { atomicWriteFileSync } = require('../../../core/atomic-write');

function saveSounds(soundsConfigPath, sounds, logger) {
  try {
    atomicWriteFileSync(soundsConfigPath, JSON.stringify(sounds, null, 2));
  } catch (error) {
    if (logger) {
      logger.log(
        'error', 'sonido', 'sonido/soundpad/save-sounds.js#saveSounds', 'sonido.soundpad.guardado_fallido',
        `No se pudo guardar sounds-config.json: ${error.message}`, { path: soundsConfigPath, error: error.message, stack: error.stack }
      );
    }
    throw error;
  }
}

module.exports = { saveSounds };
