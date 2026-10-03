'use strict';

const { createRateLimitedLog } = require('./rate-limited-log');

const KNOWN_ACTIONS = ['ALLOW', 'BLOCK', 'REVIEW'];

// Ciclo de vida del motor. Toda llamada al motor pasa por callSafely: ninguna
// excepcion sale de aqui (fail-open) y cada fallo queda logueado.
function createRustGuard({ logger, loadEngine }) {
  const logFailure = createRateLimitedLog(logger);
  const state = { engine: null, mode: 'shadow', blockedWords: new Set(), allowedWords: new Set(), wanted: false, lastFailure: null };

  function callSafely(operation, work, fallback = null) {
    try {
      return work();
    } catch (error) {
      state.lastFailure = operation;
      logFailure(operation, error.message);
      return fallback;
    }
  }

  function sync(settings) {
    state.wanted = settings.enabled;
    if (!settings.enabled) return stop();
    state.mode = settings.mode;
    if (!state.engine) return startEngine(settings);
    callSafely('updateConfig', () => state.engine.updateConfig(settings.engineConfig));
    syncBlockedWords(settings.blockedWords);
    syncAllowedWords(settings.allowedWords);
  }

  function startEngine(settings) {
    state.engine = callSafely('loadEngine', () => loadEngine(logger, settings.engineConfig));
    if (!state.engine) return;
    syncBlockedWords(settings.blockedWords);
    syncAllowedWords(settings.allowedWords);
    logger.log('info', 'moderacion', 'rust-guard/create-rust-guard.js#startEngine', 'moderacion.rust.iniciado',
      'Rust Chat Guard iniciado', { mode: state.mode });
  }

  function syncBlockedWords(words) {
    const wanted = new Set(words);
    const added = words.filter((word) => !state.blockedWords.has(word));
    const removed = [...state.blockedWords].filter((word) => !wanted.has(word));
    callSafely('syncBlockedWords', () => {
      if (added.length) state.engine.addBlockedWords(added);
      removed.forEach((word) => state.engine.removeBlockedWord(word));
    });
    state.blockedWords = wanted;
  }

  function syncAllowedWords(words = []) {
    const wanted = new Set(words);
    const added = words.filter((word) => !state.allowedWords.has(word));
    const removed = [...state.allowedWords].filter((word) => !wanted.has(word));
    callSafely('syncAllowedWords', () => {
      if (added.length) state.engine.addAllowedWords(added);
      removed.forEach((word) => state.engine.removeAllowedWord(word));
    });
    state.allowedWords = wanted;
  }

  function check(text) {
    const verdict = callSafely('check', () => state.engine.check(text));
    const usable = isUsable(verdict);
    if (usable) state.lastFailure = null;
    return usable ? verdict : null;
  }

  function isUsable(verdict) {
    if (!verdict) return false;
    if (verdict.degraded) return reportDegraded(verdict.degraded);
    return KNOWN_ACTIONS.includes(verdict.action) || reportDegraded(`accion desconocida: ${verdict.action}`);
  }

  function reportDegraded(cause) {
    logFailure('check', cause);
    return false;
  }

  function stop() {
    const { engine } = state;
    state.engine = null;
    state.blockedWords = new Set();
    state.allowedWords = new Set();
    if (engine) callSafely('stop', () => engine.stop());
  }

  // state: off (apagado) | unavailable (encendido pero sin motor: paquete ausente o
  // incompatible) | error (el motor falla al evaluar) | ok.
  function status() {
    const engineStatus = state.engine ? callSafely('getStatus', () => state.engine.getStatus()) : null;
    const running = Boolean(engineStatus && engineStatus.running);
    return {
      enabled: Boolean(state.engine),
      mode: state.mode,
      running,
      version: engineStatus ? engineStatus.versions.engine : null,
      dictionaryVersion: engineStatus ? engineStatus.versions.dictionary : null,
      state: describeState(running),
    };
  }

  function describeState(running) {
    if (!state.wanted) return 'off';
    if (!state.engine) return 'unavailable';
    return running && !state.lastFailure ? 'ok' : 'error';
  }

  return { sync, check, stop, status, isRunning: () => Boolean(state.engine), mode: () => state.mode };
}

module.exports = { createRustGuard };
