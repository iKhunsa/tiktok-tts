'use strict';

const { disconnectObs } = require('../obs/disconnect');

function obsDisconnect(deps) {
  return (_req, res) => {
    disconnectObs(deps);
    res.json({ success: true });
  };
}

module.exports = { obsDisconnect };
