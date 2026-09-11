'use strict';

const { getSafeConfig } = require('../safe-config');

function getConfig(configStore) {
  return (_req, res) => res.json(getSafeConfig(configStore.config));
}

module.exports = { getConfig };
