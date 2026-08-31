'use strict';

const { fetch: undiciFetch } = require('undici');
const { ensureTwitchAccessToken } = require('../oauth/ensure-access-token');
const { getTwitchClientId } = require('../oauth/start');
const { broadcastOauthStatus } = require('../oauth/status');

async function createTwitchFollowSubscription(deps, sessionId) {
  const { state, bus, logger } = deps;
  const accessToken = await ensureTwitchAccessToken(deps);
  const { userId } = state.authTokens.twitch;
  const twitchClientId = getTwitchClientId(bus);

  const r = await undiciFetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': twitchClientId, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'channel.follow',
      version: '2',
      condition: { broadcaster_user_id: userId, moderator_user_id: userId },
      transport: { method: 'websocket', session_id: sessionId },
    }),
  });

  if (r.status === 202) {
    state.eventsub.followActive = true;
    state.eventsub.reconnectAttempts = 0;
    broadcastOauthStatus(deps);
    logger.log(
      'info', 'canales', 'canales/twitch/eventsub/create-follow-subscription.js#createTwitchFollowSubscription', 'canales.twitch_eventsub.suscripcion_activa',
      'Suscripcion channel.follow de Twitch activa', {}
    );
    return;
  }
  const body = await r.json().catch(() => ({}));
  throw new Error(`suscripción falló HTTP ${r.status}: ${body.message || ''}`);
}

module.exports = { createTwitchFollowSubscription };
