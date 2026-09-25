'use strict';

const { getActiveAccount, safeAccountId } = require('../../../core/account-data-path');

// Una sesion de TikTok por cuenta de TikLiveTTS (mismo criterio que
// electron-shell/portal-view/session.js): el login de TikTok que hizo un
// streamer nunca lo reusa otra cuenta de la app en la misma PC. La ventana
// invisible del live (connect-tiktok-channel.js) y la visible de login/logout
// (routes/tiktok-*.js) tienen que resolver SIEMPRE la misma particion — por
// eso sale de aca y de ningun otro lado. Se resuelve en cada uso (no se
// cachea): tras `account:changed` el proximo intento ya usa la cuenta nueva.
function tiktokSessionPartition() {
  // Require perezoso (ver connect-tiktok-channel.js): esta funcion la llaman
  // rutas que siempre estan montadas, no debe forzar cargar el cliente.
  const { DEFAULT_SESSION_PARTITION } = require('@tiklivetts/tiktok-live-client');
  return `${DEFAULT_SESSION_PARTITION}-${safeAccountId(getActiveAccount())}`;
}

module.exports = { tiktokSessionPartition };
