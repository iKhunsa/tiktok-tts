'use strict';

// 8 min sin 'chat' => posible token de continuacion caducado, PERO tambien
// puede ser un stream sano con chat lento. Antes eran 4 min: demasiado
// agresivo (chat lento < 1 msg / 4 min es normal), disparaba ~74 reconexiones
// espurias en 28 h, cada una re-emitiendo el backlog. Subir el timeout de
// nuevo solo retrasaria el mismo falso positivo — por eso connect-youtube.js
// ya no reconecta directo al vencer esto: primero confirma con una prueba
// activa barata (ver connectYoutube.js#confirmYoutubeStillLive) si la
// conexion sigue sana antes de forzar la reconexion.
const WATCHDOG_TIMEOUT_MS = 8 * 60 * 1000;

// Tope del backoff de re-armado tras una confirmacion "sano" repetida (ver
// nextConfirmBackoffMs) — evita repetir la prueba activa cada 8 min para
// siempre en un canal legitimamente silencioso por horas.
const CONFIRM_BACKOFF_CAP_MS = WATCHDOG_TIMEOUT_MS * 4;

function clearWatchdogTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

/** (Re)arma el timeout de inactividad de chat para `target.key`. Llamar tras
 * conectar y en cada evento 'chat' — un stream sano nunca dispara onStale.
 * `timeoutMs` es opcional (default WATCHDOG_TIMEOUT_MS) para permitir el
 * backoff acotado tras una confirmacion "sano". */
function armWatchdog(deps, target, onStale, timeoutMs = WATCHDOG_TIMEOUT_MS) {
  const { state } = deps;
  clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);
  const timer = setTimeout(onStale, timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();
  state.youtubeWatchdogTimers.set(target.key, timer);
}

/** Siguiente intervalo de re-chequeo tras confirmar "sano": duplica el actual
 * hasta el tope, para no repetir la prueba activa cada 8 min indefinidamente
 * en un canal silencioso pero vivo. */
function nextConfirmBackoffMs(currentMs) {
  return Math.min(currentMs * 2, CONFIRM_BACKOFF_CAP_MS);
}

module.exports = {
  WATCHDOG_TIMEOUT_MS,
  CONFIRM_BACKOFF_CAP_MS,
  clearWatchdogTimer,
  armWatchdog,
  nextConfirmBackoffMs,
};
