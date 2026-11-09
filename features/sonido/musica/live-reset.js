'use strict';

const { LIVE_RESET_GRACE_MS } = require('./free-limits');
const { musicBroadcastState } = require('./broadcast-state');

/**
 * Reinicia el contador de solicitudes Free al empezar un directo nuevo. La unica
 * senal real de fin de directo es 'lista-canales' con total 0 (ver
 * canales/broadcast-channels.js, mismo criterio que promo/); se espera una
 * gracia para que una desconexion/reconexion breve NO cuente como directo nuevo.
 */
function watchLiveReset(deps) {
  const { bus, musicState } = deps;
  let timer = null;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const reset = () => {
    clear();
    musicState.liveRequests = 0;
    musicState.liveGen = (musicState.liveGen || 0) + 1; // invalida reembolsos de solicitudes en vuelo
    musicBroadcastState(deps);
  };

  bus.on('canal:estado', (p) => {
    if (!p || p.state !== 'lista-canales') return;
    const total = ['tiktok', 'twitch', 'youtube', 'kick']
      .reduce((s, k) => s + (Array.isArray(p[k]) ? p[k].length : 0), 0);
    if (total > 0) return clear();
    if (!timer) {
      timer = setTimeout(reset, LIVE_RESET_GRACE_MS);
      if (timer.unref) timer.unref();
    }
  }, 'sonido');
  bus.on('account:changing', reset, 'sonido');
}

module.exports = { watchLiveReset };
