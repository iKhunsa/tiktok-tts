'use strict';

const { loadSounds } = require('../load-sounds');

function list(soundsConfigPath) {
  return (_req, res) => res.json(loadSounds(soundsConfigPath));
}

module.exports = { list };
