'use strict';

const WATCHDOG_TIMEOUT_MS = 4 * 60 * 1000; // 4 min sin 'chat' => token de continuacion posiblemente caducado

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
  state.youtubeWatchdogTimers.set(target.key, timer);
}

module.exports = { WATCHDOG_TIMEOUT_MS, clearWatchdogTimer, armWatchdog };
