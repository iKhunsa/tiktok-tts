'use strict';

const fs = require('fs');

function loadSounds(soundsConfigPath) {
  try {
    return JSON.parse(fs.readFileSync(soundsConfigPath, 'utf8'));
  } catch (_) {
    return [];
  }
}

module.exports = { loadSounds };
