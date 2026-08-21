'use strict';

const { applyModAction } = require('../apply-mod-action');

function clear(deps) {
  return (req, res) => applyModAction(deps, req, res, (t) => deps.store.clearPunishments(t));
}

module.exports = { clear };
