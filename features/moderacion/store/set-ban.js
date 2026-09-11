'use strict';

const { mutate } = require('./mutate');

function setBan(state, target, until) {
  return mutate(state, target, (v) => { v.ban = Number(until) || 0; });
}

module.exports = { setBan };
