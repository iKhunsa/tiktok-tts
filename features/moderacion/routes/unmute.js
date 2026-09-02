'use strict';

const { applyModAction } = require('../apply-mod-action');

function unmute(deps) {
  return (req, res) => applyModAction(deps, req, res, (t) => deps.store.setMute(t, 0));
}

module.exports = { unmute };
