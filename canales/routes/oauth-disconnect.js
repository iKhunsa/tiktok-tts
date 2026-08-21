'use strict';

const { disconnectTwitchOAuth } = require('../twitch/oauth/disconnect');

function oauthDisconnect(deps) {
  return async (_req, res) => {
    await disconnectTwitchOAuth(deps);
    res.json({ success: true });
  };
}

module.exports = { oauthDisconnect };
