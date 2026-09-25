'use strict';

const { clearTikTokSession } = require('@tiklivetts/tiktok-live-client');
const { tiktokSessionPartition } = require('../tiktok/tiktok-session-partition');

/**
 * POST /api/platforms/tiktok/logout — borra SOLO la particion de TikTok de la
 * cuenta activa (cookies/storage/cache). No toca otras cuentas, PortalView,
 * ni el userData global. Los canales ya conectados siguen: su ventana ya
 * entro al live; el proximo intento correra sin sesion.
 */
function tiktokLogout(deps) {
  return async (req, res) => {
    const { bus, logger } = deps;
    try {
      await clearTikTokSession(tiktokSessionPartition());
    } catch (err) {
      logger.log('error', 'canales', 'canales/routes/tiktok-logout.js#tiktokLogout', 'canales.tiktok.logout_fallido',
        `No se pudo cerrar la sesion de TikTok: ${err.message}`, { error: err.message, stack: err.stack });
      return res.status(500).json({ error: 'No se pudo cerrar la sesión de TikTok.', errorKey: 'errors.tiktokLogoutFailed' });
    }
    logger.log('info', 'canales', 'canales/routes/tiktok-logout.js#tiktokLogout', 'canales.tiktok.sesion_cerrada',
      'Sesion de TikTok cerrada por el usuario', {});
    bus.emit('ws:broadcast', { type: 'tiktok-session', loggedIn: false });
    res.json({ ok: true });
  };
}

module.exports = { tiktokLogout };
