'use strict';

const { openTikTokLoginWindow } = require('@tiklivetts/tiktok-live-client');
const { tiktokSessionPartition } = require('../tiktok/tiktok-session-partition');
const { resumeAuthPausedChannels } = require('../tiktok/connect-tiktok-channel');

const FN = 'canales/routes/tiktok-login.js#tiktokLogin';

/**
 * POST /api/platforms/tiktok/login — abre la ventana VISIBLE del login de
 * TikTok (paquete, misma particion que la ventana invisible del live).
 * Responde al instante; el resultado llega por WS (`tiktok-session`) y, si
 * hubo login, reanuda los canales pausados por auth_required. Nunca se ve ni
 * se guarda la contrasena: TikTok autentica dentro de Chromium.
 */
function tiktokLogin(deps) {
  return (req, res) => {
    const { bus, logger, state } = deps;
    const partition = tiktokSessionPartition();
    const pausados = Array.from(state.tiktokChannels.values())
      .filter((e) => e.techState === 'auth_required').map((e) => e.username);

    let pending;
    try {
      pending = openTikTokLoginWindow({ partition });
    } catch (err) {
      logger.log('error', 'canales', FN, 'canales.tiktok.login_fallido',
        `No se pudo abrir la ventana de login de TikTok: ${err.message}`, { error: err.message, stack: err.stack });
      return res.status(500).json({ error: 'No se pudo abrir el inicio de sesión de TikTok.', errorKey: 'errors.tiktokLoginFailed' });
    }
    logger.log('info', 'canales', FN, 'canales.tiktok.login_abierto',
      'Ventana de login de TikTok abierta', { channels: pausados });

    pending.then(({ loggedIn }) => {
      // Cambio de cuenta mientras la ventana estaba abierta: ese login es de la
      // otra cuenta, no reanuda nada de esta.
      if (partition !== tiktokSessionPartition()) return;
      if (!loggedIn) {
        logger.log('info', 'canales', FN, 'canales.tiktok.login_cancelado',
          'Ventana de login de TikTok cerrada sin sesion', { channels: pausados });
        bus.emit('ws:broadcast', { type: 'tiktok-session', loggedIn: false });
        return;
      }
      const reanudados = resumeAuthPausedChannels(deps, 'login');
      logger.log('info', 'canales', FN, 'canales.tiktok.sesion_restaurada',
        'Sesion de TikTok iniciada', { channels: reanudados });
      bus.emit('ws:broadcast', { type: 'tiktok-session', loggedIn: true });
    });

    res.json({ ok: true });
  };
}

module.exports = { tiktokLogin };
