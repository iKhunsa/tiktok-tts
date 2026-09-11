'use strict';

const { fetch: undiciFetch } = require('undici');
const { cancelTwitchDevicePoll } = require('./cancel-poll');

const TWITCH_OAUTH_SCOPES = 'moderator:read:followers';

function getTwitchClientId(bus) {
  let platformConfig = null;
  bus.emit('platform-config:get', (pc) => { platformConfig = pc; });
  return platformConfig && platformConfig.twitchClientId;
}

/** Device Code Grant: cliente publico de Twitch, sin secret ni redirect URI. */
async function startTwitchDeviceAuth(deps) {
  const { state, bus, logger } = deps;
  const twitchClientId = getTwitchClientId(bus);
  if (!twitchClientId) {
    const err = new Error('Client ID de Twitch no configurado');
    err.statusCode = 400;
    throw err;
  }
  cancelTwitchDevicePoll(state);

  const r = await undiciFetch('https://id.twitch.tv/oauth2/device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: twitchClientId, scopes: TWITCH_OAUTH_SCOPES }),
  });
  const d = await r.json();
  if (!r.ok || !d.device_code) {
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/start.js#startTwitchDeviceAuth', 'canales.twitch_oauth.device_code_fallido',
      `Fallo solicitando device code de Twitch: ${d.message || `HTTP ${r.status}`}`, { error: d.message || `HTTP ${r.status}`, statusHttp: r.status }
    );
    const err = new Error(d.message || `device request HTTP ${r.status}`);
    err.statusCode = 502;
    throw err;
  }

  state.pendingOAuth.twitch = {
    deviceCode: d.device_code,
    interval: Math.max(d.interval || 5, 5),
    expiresAt: Date.now() + (d.expires_in || 1800) * 1000,
    timer: null,
  };
  require('./poll-device-token').scheduleTwitchDevicePoll(deps);

  // Dato sensible de sesion OAuth — nunca en texto plano en el log.
  const maskedUserCode = d.user_code ? `${d.user_code.slice(0, 2)}***${d.user_code.slice(-2)}` : '***';
  logger.log(
    'info', 'canales', 'canales/twitch/oauth/start.js#startTwitchDeviceAuth', 'canales.twitch_oauth.device_code_emitido',
    'Device code de Twitch emitido', { userCode: maskedUserCode }
  );

  return { url: d.verification_uri, userCode: d.user_code, expiresIn: d.expires_in || 1800 };
}

module.exports = { startTwitchDeviceAuth, TWITCH_OAUTH_SCOPES, getTwitchClientId };
