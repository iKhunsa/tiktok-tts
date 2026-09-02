'use strict';

const { fetch: undiciFetch } = require('undici');
const { saveAuthTokens } = require('./auth-tokens-store');
const { getTwitchClientId } = require('./start');
const { broadcastOauthStatus } = require('./status');

async function disconnectTwitchOAuth(deps) {
  const { state, bus } = deps;
  require('../eventsub/stop').stopTwitchEventSub(deps, 'user-disconnect');
  const token = state.authTokens.twitch && state.authTokens.twitch.accessToken;
  state.authTokens.twitch = null;
  saveAuthTokens(deps);

  const twitchClientId = getTwitchClientId(bus);
  if (token && twitchClientId) {
    undiciFetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: twitchClientId, token }),
    }).catch(() => {});
  }
  broadcastOauthStatus(deps);
}

module.exports = { disconnectTwitchOAuth };
