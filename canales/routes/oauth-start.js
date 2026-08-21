'use strict';

const { startTwitchDeviceAuth } = require('../twitch/oauth/start');

function oauthStart(deps) {
  return async (_req, res) => {
    try {
      const result = await startTwitchDeviceAuth(deps);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 502).json({ error: err.message });
    }
  };
}

module.exports = { oauthStart };
