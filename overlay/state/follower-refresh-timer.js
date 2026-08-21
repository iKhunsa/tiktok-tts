'use strict';

const REFRESH_MS = 5 * 60 * 1000;

/**
 * /overlay no tiene acceso a los `conn` de TikTok (privados de /canales) —
 * pide el refresco via bus y reacciona a canal:estado con roomInfo actualizado
 * (ver canales/index.js#register, listener 'canales:refrescar-followers').
 */
function startFollowerRefresh(deps) {
  stopFollowerRefresh(deps);
  deps.state.followerRefreshTimer = setInterval(() => {
    deps.bus.emit('canales:refrescar-followers');
  }, REFRESH_MS);
  if (deps.state.followerRefreshTimer.unref) deps.state.followerRefreshTimer.unref();
}

function stopFollowerRefresh(deps) {
  if (deps.state.followerRefreshTimer) {
    clearInterval(deps.state.followerRefreshTimer);
    deps.state.followerRefreshTimer = null;
  }
}

module.exports = { startFollowerRefresh, stopFollowerRefresh, REFRESH_MS };
