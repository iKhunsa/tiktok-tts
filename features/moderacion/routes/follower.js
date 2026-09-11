'use strict';

const { applyModAction } = require('../apply-mod-action');

function follower(deps) {
  return (req, res) => {
    const value = (req.body || {}).value !== false;
    applyModAction(deps, req, res, (t) => deps.store.setWhitelist(t, value), { accion: 'follower' });
  };
}

module.exports = { follower };
