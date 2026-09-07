'use strict';

function state(mobileState) {
  return (_req, res) => res.json(mobileState);
}

module.exports = { state };
