'use strict';

const { createRateLimitedLog } = require('./rate-limited-log');

const KNOWN_ACTIONS = ['ALLOW', 'BLOCK', 'REVIEW'];

// Ciclo de vida del motor. Toda llamada al motor pasa por callSafely: ninguna
// excepcion sale de aqui (fail-open) y cada fallo queda logueado.
function createRustGuard({ logger, loadEngine }) {
  const logFailure = createRateLimitedLog(logger);
  const state = { engine: null, mode: 'shadow', blockedWords: new Set() };

  function callSafely(operation, work, fallback = null) {
    try {
      return work();
    } catch (error) {
      logFailure(operation, error.message);
      return fallback;
    }
  }

  function sync(settings) {
    if (!settings.enabled) return stop();
    state.mode = settings.mode;
    if (!state.engine) return startEngine(settings);
    callSafely('updateConfig', () => state.engine.updateConfig(settings.engineConfig));
    syncBlockedWords(settings.blockedWords);
  }

  function startEngine(settings) {
    state.engine = callSafely('loadEngine', () => loadEngine(logger, settings.engineConfig));
    if (!state.engine) return;
    syncBlockedWords(settings.blockedWords);
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

  function check(text) {
    const verdict = callSafely('check', () => state.engine.check(text));
    return isUsable(verdict) ? verdict : null;
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
    if (engine) callSafely('stop', () => engine.stop());
  }

  function status() {
    const engineStatus = state.engine ? callSafely('getStatus', () => state.engine.getStatus()) : null;
    return {
      enabled: Boolean(state.engine),
      mode: state.mode,
      running: Boolean(engineStatus && engineStatus.running),
      version: engineStatus ? engineStatus.versions.engine : null,
    };
  }

  return { sync, check, stop, status, isRunning: () => Boolean(state.engine), mode: () => state.mode };
}

module.exports = { createRustGuard };
