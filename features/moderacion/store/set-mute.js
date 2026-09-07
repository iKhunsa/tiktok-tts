'use strict';

const { mutate } = require('./mutate');

function setMute(state, target, until) {
  return mutate(state, target, (v) => { v.mute = Number(until) || 0; });
}

module.exports = { setMute };
