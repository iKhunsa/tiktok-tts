'use strict';

const entitlements = require('../../../core/contracts/entitlements');

// Plan Free del bot musical. Pro (feature 'bot-musical') = sin limites.
// Con subscriptionsEnabled=false check() devuelve true -> todos son Pro.
const FREE_MAX_REQUESTS = 20; // solicitudes por directo
const FREE_MAX_QUEUE = 5; // canciones en cola a la vez
const LIVE_RESET_GRACE_MS = 5 * 60 * 1000; // sin canales > esto = directo terminado

const isPro = () => entitlements.check('bot-musical');

/** { used, limit } — limit null = ilimitado (Pro). */
function liveQuota(musicState) {
  return { used: musicState.liveRequests || 0, limit: isPro() ? null : FREE_MAX_REQUESTS };
}

module.exports = { FREE_MAX_REQUESTS, FREE_MAX_QUEUE, LIVE_RESET_GRACE_MS, isPro, liveQuota };
