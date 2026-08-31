'use strict';

function stats(store) {
  return (_req, res) => res.json(store.stats());
}

module.exports = { stats };
