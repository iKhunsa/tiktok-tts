'use strict';

// Ritmo de reintento del supervisor de continuidad de TikTok. Grupo inicial
// corto y rapido (se siente instantaneo), despues backoff mas espaciado
// SIN limite mientras la intencion del usuario siga activa — a diferencia del
// viejo MAX_RECONNECT_ATTEMPTS (channel-maps.js, todavia usado por
// twitch/youtube/kick/obs), TikTok ya no se da por vencido solo.
const FAST_BURST_DELAYS_MS = [1000, 2000, 3000, 5000];
const STEADY_BACKOFF_BASE_MS = 10000;
const STEADY_BACKOFF_FACTOR = 2;
const STEADY_BACKOFF_CAP_MS = 60000;

// "Esperando proximo live" (offline confirmado): ritmo mucho mas lento, no
// tiene sentido pollear cada pocos segundos un canal que no esta transmitiendo.
const WAITING_LIVE_BASE_MS = 30000;
const WAITING_LIVE_FACTOR = 2;
const WAITING_LIVE_CAP_MS = 5 * 60 * 1000;

// Umbral de parpadeo de UI: una recuperacion que se resuelve antes de esto
// nunca le muestra "Restaurando..." al usuario (evita flicker por blips).
const RECOVERY_VISIBLE_THRESHOLD_MS = 2000;

/**
 * @param {number} consecutiveFailures 1-based (primer fallo = 1)
 * @param {{tiktokAnswered?: boolean}} [opts] `tiktokAnswered`: el fallo trae un
 *   `tiktokStatusCode` — TikTok respondio con un rechazo explicito, no fue un
 *   fallo de red/firma. Pasada la rafaga rapida converge al ritmo de
 *   "esperando proximo live": 30003 se vio por horas seguidas con el canal
 *   offline (log de usuario 2026-09-22/24, ~400 intentos a 60s, cada uno con
 *   una pagina de TikTok completa en Chromium).
 */
function nextRetryDelayMs(consecutiveFailures, { tiktokAnswered = false } = {}) {
  const burstIndex = consecutiveFailures - 1;
  if (burstIndex < FAST_BURST_DELAYS_MS.length) return FAST_BURST_DELAYS_MS[burstIndex];
  const steadyIndex = burstIndex - FAST_BURST_DELAYS_MS.length;
  if (tiktokAnswered) return nextWaitingLiveDelayMs(steadyIndex);
  return Math.min(STEADY_BACKOFF_BASE_MS * STEADY_BACKOFF_FACTOR ** steadyIndex, STEADY_BACKOFF_CAP_MS);
}

/** @param {number} consecutiveWaits 0-based (primera espera = 0) */
function nextWaitingLiveDelayMs(consecutiveWaits) {
  return Math.min(WAITING_LIVE_BASE_MS * WAITING_LIVE_FACTOR ** consecutiveWaits, WAITING_LIVE_CAP_MS);
}

module.exports = {
  FAST_BURST_DELAYS_MS,
  RECOVERY_VISIBLE_THRESHOLD_MS,
  nextRetryDelayMs,
  nextWaitingLiveDelayMs,
};
