'use strict';

const { mutate } = require('./mutate');

function clearPunishments(state, target) {
  return mutate(state, target, (v) => { v.mute = 0; v.ban = 0; });
}

module.exports = { clearPunishments };
