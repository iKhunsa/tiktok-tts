'use strict';

function patchPlatformConfig(platformConfigStore) {
  return (req, res) => {
    const allowed = Object.keys(platformConfigStore.platformConfig);
    for (const [k, v] of Object.entries(req.body || {})) {
      if (allowed.includes(k) && typeof v === 'string') platformConfigStore.platformConfig[k] = v;
    }
    platformConfigStore.save();
    res.json({ twitchClientId: platformConfigStore.platformConfig.twitchClientId });
  };
}

module.exports = { patchPlatformConfig };
