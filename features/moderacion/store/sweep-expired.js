'use strict';

const { markDirty } = require('./flush');

/** Normaliza a 0 los castigos vencidos. La lectura ya es perezosa; esto solo evita arrastrar timestamps muertos. */
function sweepExpired(state) {
  const t = Date.now();
  let cleaned = 0;
  for (const v of state.viewers.values()) {
    if (v.mute > 0 && v.mute <= t) { v.mute = 0; cleaned++; }
    if (v.ban > 0 && v.ban <= t) { v.ban = 0; cleaned++; }
  }
  if (cleaned) {
    markDirty(state);
    state.logger.log(
      'info', 'moderacion', 'moderacion/store/sweep-expired.js#sweepExpired', 'moderacion.store.castigos_expirados',
      `Se limpiaron ${cleaned} castigo(s) vencido(s)`, { cleaned }
    );
  }
  return cleaned;
}

module.exports = { sweepExpired };
