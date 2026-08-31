'use strict';

const { oauthStatusPayload } = require('../twitch/oauth/status');

function oauthStatus(state) {
  return (_req, res) => res.json(oauthStatusPayload(state));
}

module.exports = { oauthStatus };
