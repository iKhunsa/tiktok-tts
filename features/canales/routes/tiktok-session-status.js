'use strict';

const { tiktokSessionPartition } = require('../tiktok/tiktok-session-partition');

/**
 * GET /api/platforms/tiktok/session — `{ available, loggedIn, authRequired }`.
 * `available:false` fuera de Electron (`npm run dev`): no hay sesiones de
 * Chromium, la UI oculta los botones de login.
 */
function tiktokSessionStatus(state) {
  return async (req, res) => {
    const authRequired = Array.from(state.tiktokChannels.values())
      .filter((e) => e.techState === 'auth_required').map((e) => e.username);
    try {
      const { hasTikTokSession } = require('@tiklivetts/tiktok-live-client');
      res.json({ available: true, loggedIn: await hasTikTokSession(tiktokSessionPartition()), authRequired });
    } catch (_) {
      res.json({ available: false, loggedIn: false, authRequired });
    }
  };
}

module.exports = { tiktokSessionStatus };
