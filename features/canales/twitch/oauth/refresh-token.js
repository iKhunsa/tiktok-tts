'use strict';

const { fetch: undiciFetch } = require('undici');
const { saveAuthTokens } = require('./auth-tokens-store');
const { getTwitchClientId } = require('./start');
const { broadcastOauthStatus } = require('./status');

async function refreshTwitchToken(deps) {
  const { state, bus, logger } = deps;
  const t = state.authTokens.twitch;
  if (!t || !t.refreshToken) throw new Error('sin refresh token de Twitch');

  const twitchClientId = getTwitchClientId(bus);
  const r = await undiciFetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: twitchClientId, grant_type: 'refresh_token', refresh_token: t.refreshToken }),
  });
  const tok = await r.json();
  if (!r.ok || !tok.access_token) {
    // Refresh invalido/revocado: requiere reautorizar manualmente.
    state.authTokens.twitch = null;
    saveAuthTokens(deps);
    require('../eventsub/stop').stopTwitchEventSub(deps, 'token-revoked');
    broadcastOauthStatus(deps);
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/refresh-token.js#refreshTwitchToken', 'canales.twitch_oauth.refresh_fallido',
      `Fallo refrescando token de Twitch: ${tok.message || `HTTP ${r.status}`}`, { error: tok.message || `HTTP ${r.status}`, statusHttp: r.status }
    );
    throw new Error(tok.message || `refresh HTTP ${r.status}`);
  }

  t.accessToken = tok.access_token;
  if (tok.refresh_token) t.refreshToken = tok.refresh_token; // Twitch rota el refresh token
  t.expiresAt = Date.now() + (tok.expires_in || 3600) * 1000;
  saveAuthTokens(deps);
  return t.accessToken;
}

module.exports = { refreshTwitchToken };
