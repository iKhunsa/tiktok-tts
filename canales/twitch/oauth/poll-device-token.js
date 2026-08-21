'use strict';

const { fetch: undiciFetch } = require('undici');
const { TWITCH_OAUTH_SCOPES, getTwitchClientId } = require('./start');
const { broadcastOauthStatus } = require('./status');
const { saveAuthTokens } = require('./auth-tokens-store');

function scheduleTwitchDevicePoll(deps) {
  const p = deps.state.pendingOAuth.twitch;
  if (!p) return;
  // +1s de margen: Twitch responde slow_down si se pollea mas rapido que interval.
  p.timer = setTimeout(() => pollTwitchDeviceToken(deps), (p.interval + 1) * 1000);
}

async function pollTwitchDeviceToken(deps) {
  const { state, bus, logger } = deps;
  const p = state.pendingOAuth.twitch;
  if (!p) return;

  if (Date.now() > p.expiresAt) {
    state.pendingOAuth.twitch = null;
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/poll-device-token.js#pollTwitchDeviceToken', 'canales.twitch_oauth.device_code_expirado',
      'Device code de Twitch expiro sin autorizar', {}
    );
    bus.emit('ws:broadcast', { type: 'twitch-auth-error', error: 'La autorización expiró. Intentá de nuevo.' });
    return;
  }

  const twitchClientId = getTwitchClientId(bus);
  let tok;
  try {
    const r = await undiciFetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: twitchClientId,
        scopes: TWITCH_OAUTH_SCOPES,
        device_code: p.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    tok = await r.json();
    if (!r.ok || !tok.access_token) {
      const msg = String(tok.message || '').toLowerCase();
      if (msg.includes('authorization_pending')) return scheduleTwitchDevicePoll(deps);
      if (msg.includes('slow')) { p.interval += 5; return scheduleTwitchDevicePoll(deps); }
      state.pendingOAuth.twitch = null;
      logger.log(
        'warn', 'canales', 'canales/twitch/oauth/poll-device-token.js#pollTwitchDeviceToken', 'canales.twitch_oauth.poll_error',
        `Fallo device flow de Twitch: ${tok.message || `HTTP ${r.status}`}`, { error: tok.message || `HTTP ${r.status}`, statusHttp: r.status }
      );
      bus.emit('ws:broadcast', { type: 'twitch-auth-error', error: tok.message || 'Twitch rechazó la autorización' });
      return;
    }
  } catch (error) {
    // Fixea el catch mas citado de esta subcarpeta: antes 100% silencioso
    // ante errores de red (backend-viejo/server.js:3432).
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/poll-device-token.js#pollTwitchDeviceToken', 'canales.twitch_oauth.poll_error',
      `Error de red haciendo poll de device token de Twitch: ${error.message}`, { error: error.message }
    );
    return scheduleTwitchDevicePoll(deps);
  }

  state.pendingOAuth.twitch = null;
  try {
    const ur = await undiciFetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${tok.access_token}`, 'Client-Id': twitchClientId },
    });
    const ud = await ur.json();
    const me = ud.data && ud.data[0];
    if (!ur.ok || !me) throw new Error('no se pudo obtener el usuario de Twitch');

    state.authTokens.twitch = {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || null,
      expiresAt: Date.now() + (tok.expires_in || 3600) * 1000,
      login: me.login,
      userId: me.id,
    };
    saveAuthTokens(deps);
    bus.emit('ws:broadcast', { type: 'twitch-auth-ready', login: me.login }); // compat con UI vieja
    broadcastOauthStatus(deps);
    logger.log(
      'info', 'canales', 'canales/twitch/oauth/poll-device-token.js#pollTwitchDeviceToken', 'canales.twitch_oauth.autorizado',
      `Twitch autorizado: ${me.login}`, { login: me.login }
    );
    require('../eventsub/start').startTwitchEventSub(deps);
  } catch (error) {
    logger.log(
      'warn', 'canales', 'canales/twitch/oauth/poll-device-token.js#pollTwitchDeviceToken', 'canales.twitch_oauth.poll_error',
      `Fallo completando autorizacion de Twitch: ${error.message}`, { error: error.message }
    );
    bus.emit('ws:broadcast', { type: 'twitch-auth-error', error: `Error conectando con Twitch: ${error.message}` });
  }
}

module.exports = { scheduleTwitchDevicePoll, pollTwitchDeviceToken };
