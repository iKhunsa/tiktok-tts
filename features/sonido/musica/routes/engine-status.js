'use strict';

function engineStatus(engine) {
  return (_req, res) => res.json(engine.getStatus());
}

module.exports = { engineStatus };
