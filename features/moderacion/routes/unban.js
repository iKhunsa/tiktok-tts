'use strict';

const { applyModAction } = require('../apply-mod-action');

function unban(deps) {
  return (req, res) => applyModAction(deps, req, res, (t) => deps.store.setBan(t, 0));
}

module.exports = { unban };
