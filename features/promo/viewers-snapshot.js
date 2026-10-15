'use strict';

// ponytail: TikTok empuja viewerCount periodicamente; un dato mas viejo que
// esto se ignora (canal caido) en vez de decidir con una cifra rancia.
const FRESH_MS = 3 * 60 * 1000;

const porCanal = new Map();

function registrarViewers({ platform, channel, viewerCount } = {}) {
  if (platform !== 'tiktok' || !Number.isFinite(viewerCount)) return;
  porCanal.set(channel, { count: viewerCount, ts: Date.now() });
}

/** Suma de los canales de TikTok con dato fresco. */
function totalViewers() {
  const cutoff = Date.now() - FRESH_MS;
  let total = 0;
  for (const { count, ts } of porCanal.values()) if (ts >= cutoff) total += count;
  return total;
}

function reiniciar() {
  porCanal.clear();
}

module.exports = { registrarViewers, totalViewers, reiniciar };
