'use strict';

const fs = require('fs');

function saveSounds(soundsConfigPath, sounds) {
  fs.writeFileSync(soundsConfigPath, JSON.stringify(sounds, null, 2), 'utf8');
}

module.exports = { saveSounds };
