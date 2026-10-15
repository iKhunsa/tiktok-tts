'use strict';

const MINUTE_MS = 60 * 1000;
const FIRST_PROMO_MINUTES = 15;
const CYCLE_MINUTES = 25;
const WATCH_MINUTES = 5;

/**
 * Dispara onMilestone() mientras haya una sesion de vivo activa (ver
 * promo/index.js). Primer aviso: 15 min fijos, sin condicion. Despues, 25 min
 * tras cada aviso se evalua hayAudiencia(): si hay, suena; si no, se vigila
 * cada 5 min y suena en cuanto aparezca audiencia. Cada aviso reinicia el ciclo.
 */
function createSessionScheduler({ onMilestone, hayAudiencia, logger }) {
  let timer = null;
  let running = false;

  function fire() {
    // Sin este try/catch, un throw en onMilestone() corta el ciclo y mata la
    // autopromocion para toda la sesion en silencio.
    try {
      onMilestone();
    } catch (error) {
      if (logger) logger.log(
        'warn', 'promo', 'promo/session-scheduler.js#fire', 'promo.autopromocion.fallo_callback',
        `El callback de autopromocion lanzo: ${error.message}`, { error: error.message, stack: error.stack }
      );
    }
  }

  function arm(minutes, fn) {
    timer = setTimeout(() => {
      if (running) fn();
    }, minutes * MINUTE_MS);
  }

  function startCycle() {
    arm(CYCLE_MINUTES, () => evaluate('ciclo'));
  }

  function evaluate(fase) {
    const { ok, viewers, personas } = hayAudiencia();
    if (logger) logger.log(
      'info', 'promo', 'promo/session-scheduler.js#evaluate', 'promo.autopromocion.evaluada',
      `Evaluacion de audiencia (${fase}): ${ok ? 'suena' : 'sin audiencia'}`, { fase, viewers, personas, ok }
    );
    if (ok) {
      fire();
      startCycle();
    } else {
      arm(WATCH_MINUTES, () => evaluate('vigilancia'));
    }
  }

  /** No reinicia el conteo si ya hay una sesion en curso: conectar un canal
   * adicional (ej. sumar Twitch a un live que ya tenia TikTok) no debe
   * resetear el timer de autopromocion. */
  function startIfNeeded() {
    if (running) return;
    running = true;
    if (timer) { clearTimeout(timer); timer = null; }
    arm(FIRST_PROMO_MINUTES, () => {
      fire();
      startCycle();
    });
  }

  function stop() {
    running = false;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return { startIfNeeded, stop };
}

module.exports = { createSessionScheduler, FIRST_PROMO_MINUTES, CYCLE_MINUTES, WATCH_MINUTES };
