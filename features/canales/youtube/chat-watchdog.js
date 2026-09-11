'use strict';

// 8 min sin 'chat' => token de continuacion posiblemente caducado.
// Antes eran 4 min: demasiado agresivo para un stream de YouTube tranquilo
// (chat lento < 1 msg / 4 min es normal), disparaba ~74 reconexiones espurias
// en 28 h, cada una re-emitiendo el backlog. 8 min tolera el silencio legitimo
// y sigue detectando el modo de fallo real (200 OK con actions:[], sin 'error')
// dentro de un tiempo razonable — la reconexion arranca a los <=8 min.
const WATCHDOG_TIMEOUT_MS = 8 * 60 * 1000;

function clearWatchdogTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

/** (Re)arma el timeout de inactividad de chat para `target.key`. Llamar tras
 * conectar y en cada evento 'chat' — un stream sano nunca dispara onStale. */
function armWatchdog(deps, target, onStale) {
  const { state } = deps;
  clearWatchdogTimer(state.youtubeWatchdogTimers, target.key);
  const timer = setTimeout(onStale, WATCHDOG_TIMEOUT_MS);
  if (typeof timer.unref === 'function') timer.unref();
  state.youtubeWatchdogTimers.set(target.key, timer);
}

module.exports = { WATCHDOG_TIMEOUT_MS, clearWatchdogTimer, armWatchdog };
