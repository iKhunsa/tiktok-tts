'use strict';

// Watchdog de socket mudo para TikTok y Twitch. El heartbeat interno de
// tiktok-live-client / tmi.js es fire-and-forget: si el TCP queda half-open
// (NAT timeout, suspension del equipo, blip de red) el conector no emite
// 'close'/'error'/'disconnected' y la app reporta "en vivo" contra una
// conexion muerta hasta el reconnect por timer (~1h) o hasta "conectar todo".
//
// Kick y YouTube ya tienen su propio watchdog (kick/stale-watchdog.js,
// youtube/chat-watchdog.js) con Maps propios cableados en sus teardowns; no se
// unifican aca a proposito — migrarlos es churn con riesgo de regresion en
// esos paths y cero beneficio para el usuario. Este helper es solo TikTok +
// Twitch, sobre un Map nuevo (state.channelWatchdogTimers).
const WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000;

function clearWatchdog(state, key) {
  const timer = state.channelWatchdogTimers.get(key);
  if (timer) clearTimeout(timer);
  state.channelWatchdogTimers.delete(key);
}

/** (Re)arma el timeout de inactividad para `key`. Llamar al conectar y en cada
 * mensaje de chat — un canal con actividad nunca dispara `onStale`. El timer
 * hace unref(): un straggler no impide que el proceso salga limpio, y `onStale`
 * debe chequear identidad del entry antes de reconectar. */
function armWatchdog(state, key, timeoutMs, onStale) {
  clearWatchdog(state, key);
  const timer = setTimeout(onStale, timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();
  state.channelWatchdogTimers.set(key, timer);
}

module.exports = { WATCHDOG_TIMEOUT_MS, armWatchdog, clearWatchdog };
