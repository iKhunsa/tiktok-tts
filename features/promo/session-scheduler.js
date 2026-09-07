'use strict';

const MINUTE_MS = 60 * 1000;

// Deltas ENTRE avisos consecutivos (no minutos absolutos de sesion): esperar
// 15 min, luego 45 min mas, luego 60 min mas — asi lo pidio el streamer.
// Agotada la lista, se repite REPEAT_MINUTES indefinidamente.
const SCHEDULE_MINUTES = [15, 45, 60];
const REPEAT_MINUTES = 90;

/**
 * Dispara onMilestone() en cadena mientras haya una sesion de vivo activa
 * (ver promo/index.js): primer aviso a los 15 min de conectar el primer
 * canal, siguiente 45 min despues (60 min de sesion), siguiente 60 min
 * despues (120 min de sesion), y de ahi en mas cada 90 min para siempre.
 */
function createSessionScheduler({ onMilestone, logger }) {
  let timer = null;
  let stepIndex = 0;
  let running = false;

  function scheduleNext() {
    const deltaMinutes = stepIndex < SCHEDULE_MINUTES.length ? SCHEDULE_MINUTES[stepIndex] : REPEAT_MINUTES;
    stepIndex++;
    timer = setTimeout(() => {
      // Sin este try/catch, un throw en onMilestone() corta scheduleNext() y
      // mata la autopromocion para toda la sesion en silencio.
      try {
        onMilestone();
      } catch (error) {
        if (logger) logger.log(
          'warn', 'promo', 'promo/session-scheduler.js#scheduleNext', 'promo.autopromocion.fallo_callback',
          `El callback de autopromoción lanzó: ${error.message}`, { error: error.message, stack: error.stack }
        );
      }
      scheduleNext();
    }, deltaMinutes * MINUTE_MS);
  }

  /** No reinicia el conteo si ya hay una sesion en curso — conectar un canal
   * adicional (ej. sumar Twitch a un live que ya tenia TikTok) no debe
   * resetear el timer de autopromocion. */
  function startIfNeeded() {
    if (running) return;
    running = true;
    stepIndex = 0;
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

module.exports = { createSessionScheduler, SCHEDULE_MINUTES, REPEAT_MINUTES };
