'use strict';

const fs = require('fs');

function loadSounds(soundsConfigPath, logger) {
  try {
    return JSON.parse(fs.readFileSync(soundsConfigPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return []; // no existe todavia, no es corrupcion
    try {
      fs.renameSync(soundsConfigPath, `${soundsConfigPath}.corrupt-${Date.now()}`);
    } catch (_) { /* best-effort */ }
    if (logger) {
      logger.log(
        'warn', 'sonido', 'sonido/soundpad/load-sounds.js#loadSounds', 'sonido.soundpad.config_corrupta',
        `sounds-config.json corrupto, se aparto y se arranca vacio: ${error.message}`, { path: soundsConfigPath, error: error.message }
      );
    }
    return [];
  }
}

module.exports = { loadSounds };
