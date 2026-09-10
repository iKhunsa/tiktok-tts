'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { setupTikTokConnection } = require('./connect-tiktok-channel');
const { cleanupAfterLastTikTokChannel } = require('./cleanup-after-last-channel');

async function reconnectTiktok(deps, username) {
  const { state, bus, logger } = deps;
  const entry = state.tiktokChannels.get(username);
  if (!entry) return;

  try {
    setupTikTokConnection(deps, username);
    const refreshed = state.tiktokChannels.get(username);
    const connState = await refreshed.conn.connect();
    refreshed.attempts = 0;
    refreshed.connectedOnce = true;
    if (refreshed.timer) { clearTimeout(refreshed.timer); refreshed.timer = null; }
    if (refreshed.armStaleWatchdog) refreshed.armStaleWatchdog();

    logger.log(
      'info', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconexion_exitosa',
      `Reconexion de TikTok ${username} exitosa`, { channel: username }
    );
    bus.emit('canal:estado', {
      platform: 'tiktok', channel: username, state: 'conectado',
      roomInfo: (connState && connState.roomInfo) || null, isReconnect: true,
    });
  } catch (err) {
    const e2 = state.tiktokChannels.get(username);
    if (!e2) return;

    // client.js:430 rechaza con un string, no un Error → err.message seria undefined.
    const msg = err && err.message ? err.message : String(err);
    logger.log(
      'error', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconexion_fallida',
      `Fallo reconexion de TikTok ${username}: ${msg}`,
      { channel: username, attempt: e2.attempts, error: msg, stack: err && err.stack }
    );

    if (e2.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, e2.attempts), 30000);
      e2.attempts++;
      logger.log(
        'warn', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconectando',
        `Reconectando TikTok ${username}, intento ${e2.attempts}`, { channel: username, intento: e2.attempts, delayMs: delay }
      );
      bus.emit('canal:estado', { platform: 'tiktok', channel: username, state: 'reconectando', attempt: e2.attempts, delayMs: delay });
      e2.timer = setTimeout(() => reconnectTiktok(deps, username), delay);
    } else {
      state.tiktokChannels.delete(username);
      cleanupAfterLastTikTokChannel(deps);
    }
  }
}

module.exports = { reconnectTiktok };
