'use strict';

function getConfig(configStore) {
  return (_req, res) => res.json(configStore.config);
}

module.exports = { getConfig };
