'use strict';

function getPlatformConfig(platformConfigStore) {
  return (_req, res) => res.json({ twitchClientId: platformConfigStore.platformConfig.twitchClientId });
}

module.exports = { getPlatformConfig };
