'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { setupTikTokConnection, readTikTokError, teardownConn } = require('./connect-tiktok-channel');
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
    refreshed.armStaleWatchdog();

    logger.log(
      'info', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconexion_exitosa',
      `Reconexion de TikTok ${username} exitosa`, { channel: username }
    );
    bus.emit('canal:estado', {
      platform: 'tiktok', channel: username, state: 'conectado',
      roomInfo: (connState && connState.roomInfo) || null, isReconnect: true,
    });
  } catch (err) {
    const current = state.tiktokChannels.get(username);
    if (!current) return;

    const { message, stack } = readTikTokError(err);
    logger.log(
      'error', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconexion_fallida',
      `Fallo reconexion de TikTok ${username}: ${message}`,
      { channel: username, attempt: current.attempts, error: message, stack }
    );

    if (current.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * 2 ** current.attempts, 30000);
      current.attempts++;
      logger.log(
        'warn', 'canales', 'canales/tiktok/reconnect-tiktok.js#reconnectTiktok', 'canales.tiktok.reconectando',
        `Reconectando TikTok ${username}, intento ${current.attempts}`, { channel: username, intento: current.attempts, delayMs: delay }
      );
      bus.emit('canal:estado', { platform: 'tiktok', channel: username, state: 'reconectando', attempt: current.attempts, delayMs: delay });
      current.timer = setTimeout(() => reconnectTiktok(deps, username), delay);
    } else {
      state.tiktokChannels.delete(username);
      teardownConn(current);
      cleanupAfterLastTikTokChannel(deps);
    }
  }
}

module.exports = { reconnectTiktok };
