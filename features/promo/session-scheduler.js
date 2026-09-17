'use strict';

const MINUTE_MS = 60 * 1000;
const FIRST_PROMO_MINUTES = 15;
const { mensajesPorMinuto, calcularIntervaloMinutos } = require('./activity-window');

/**
 * Dispara onMilestone() en cadena mientras haya una sesion de vivo activa
 * (ver promo/index.js). El primer aviso espera el warm-up fijo de 15 min;
 * cada aviso siguiente usa la actividad reciente del chat.
 */
function createSessionScheduler({ onMilestone, logger }) {
  let timer = null;
  let stepIndex = 0;
  let running = false;

  function scheduleNext() {
    const deltaMinutes = stepIndex === 0
      ? FIRST_PROMO_MINUTES
      : calcularIntervaloMinutos(mensajesPorMinuto());
    stepIndex++;
    timer = setTimeout(() => {
      if (!running) return;
      // Sin este try/catch, un throw en onMilestone() corta scheduleNext() y
      // mata la autopromocion para toda la sesion en silencio.
      try {
        onMilestone();
      } catch (error) {
        if (logger) logger.log(
          'warn', 'promo', 'promo/session-scheduler.js#scheduleNext', 'promo.autopromocion.fallo_callback',
          `El callback de autopromocion lanzo: ${error.message}`, { error: error.message, stack: error.stack }
        );
      }
      scheduleNext();
    }, deltaMinutes * MINUTE_MS);
  }

  /** No reinicia el conteo si ya hay una sesion en curso: conectar un canal
   * adicional (ej. sumar Twitch a un live que ya tenia TikTok) no debe
   * resetear el timer de autopromocion. */
  function startIfNeeded() {
    if (running) return;
    running = true;
    stepIndex = 0;
    if (timer) { clearTimeout(timer); timer = null; }
    scheduleNext();
  }

  function stop() {
    running = false;
    stepIndex = 0;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { startIfNeeded, stop };
}

module.exports = { createSessionScheduler, FIRST_PROMO_MINUTES };
