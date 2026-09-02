'use strict';

const { disconnectTwitchOAuth } = require('../twitch/oauth/disconnect');

function oauthDisconnect(deps) {
  return async (_req, res, next) => {
    try {
      await disconnectTwitchOAuth(deps);
      res.json({ success: true });
    } catch (err) {
      next(err); // → middleware de error global de core/app.js
    }
  };
}

module.exports = { oauthDisconnect };
