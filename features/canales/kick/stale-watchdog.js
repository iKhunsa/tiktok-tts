'use strict';

// Sin socket propio del que colgar reconexion de bajo nivel (eso lo maneja
// el script.js de corard.tv dentro de la ventana oculta) — este watchdog solo
// vigila "¿llego al menos un mensaje del preload en los ultimos N minutos?"
// para poder diagnosticar una captura rota en silencio (corard.tv cambio su
// DOM, la ventana quedo bloqueada, etc.).
const WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000;

function clearKickWatchdog(map, slug) {
  const timer = map.get(slug);
  if (timer) clearTimeout(timer);
  map.delete(slug);
}

/** (Re)arma el timeout de inactividad para `slug`. Llamar tras abrir la
 * ventana y en cada `canal:mensaje-crudo` de ese slug. */
function armKickWatchdog(deps, slug, onStale) {
  const { state } = deps;
  clearKickWatchdog(state.kickWatchdogTimers, slug);
  const timer = setTimeout(() => onStale(slug), WATCHDOG_TIMEOUT_MS);
  state.kickWatchdogTimers.set(slug, timer);
}

module.exports = { WATCHDOG_TIMEOUT_MS, clearKickWatchdog, armKickWatchdog };
