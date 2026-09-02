'use strict';

const { refreshTwitchToken } = require('./refresh-token');

async function ensureTwitchAccessToken(deps) {
  const t = deps.state.authTokens.twitch;
  if (!t) throw new Error('Twitch no autorizado');
  if (Date.now() > t.expiresAt - 5 * 60 * 1000) await refreshTwitchToken(deps);
  return deps.state.authTokens.twitch.accessToken;
}

module.exports = { ensureTwitchAccessToken };
