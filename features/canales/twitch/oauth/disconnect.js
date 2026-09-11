'use strict';

const { saveAuthTokens } = require('./auth-tokens-store');
const { getTwitchClientId } = require('./start');
const { broadcastOauthStatus } = require('./status');

async function disconnectTwitchOAuth(deps) {
  const { state, bus, logger } = deps;
  require('../eventsub/stop').stopTwitchEventSub(deps, 'user-disconnect');
  const token = state.authTokens.twitch && state.authTokens.twitch.accessToken;
  state.authTokens.twitch = null;
  saveAuthTokens(deps);

  const twitchClientId = getTwitchClientId(bus);
  if (token && twitchClientId) {
    fetch('https://id.twitch.tv/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: twitchClientId, token }),
    }).catch((error) => {
      logger.log(
        'warn', 'canales', 'canales/twitch/oauth/disconnect.js#disconnectTwitchOAuth', 'canales.twitch_oauth.revocacion_fallida',
        `No se pudo revocar el token de Twitch: ${error.message}`, { error: error.message }
      );
    });
  }
  broadcastOauthStatus(deps);
}

module.exports = { disconnectTwitchOAuth };
