'use strict';

const fs = require('fs');
const { SCHEMA_VERSION, DEBOUNCE_MS, MAX_DELAY_MS } = require('./state');
const { purge } = require('./purge');

function clearTimers(state) {
  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  if (state.maxDelayTimer) clearTimeout(state.maxDelayTimer);
  state.debounceTimer = null;
  state.maxDelayTimer = null;
}

/**
 * Siempre escribe de forma sincrona; lo unico que decide el debounce es
 * *cuando* se llega aca. Las acciones de moderacion llaman flush directo.
 */
function flush(state) {
  clearTimers(state);
  if (!state.dirty) return;
  if (state.viewers.size > state.maxViewers) purge(state);

  const payload = {
    version: SCHEMA_VERSION,
    savedAt: Date.now(),
    viewers: Object.fromEntries(state.viewers),
  };

  try {
    fs.writeFileSync(state.tmpPath, JSON.stringify(payload), 'utf8');
    fs.renameSync(state.tmpPath, state.filePath);
    state.dirty = false;
    state.logger.log(
      'info', 'moderacion', 'moderacion/store/flush.js#flush', 'moderacion.store.guardado',
      `moderation.json guardado con ${state.viewers.size} viewer(s)`, { path: state.filePath, viewers: state.viewers.size }
    );
  } catch (error) {
    state.logger.log(
      'error', 'moderacion', 'moderacion/store/flush.js#flush', 'moderacion.store.guardado_fallido',
      `No se pudo guardar moderation.json: ${error.message}`, { path: state.filePath, error: error.message, stack: error.stack }
    );
  }
}

/** Marca el store como sucio y programa el proximo flush (debounce + techo duro). */
function markDirty(state) {
  state.dirty = true;
  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => flush(state), DEBOUNCE_MS);
  if (state.debounceTimer.unref) state.debounceTimer.unref();
  if (!state.maxDelayTimer) {
    state.maxDelayTimer = setTimeout(() => flush(state), MAX_DELAY_MS);
    if (state.maxDelayTimer.unref) state.maxDelayTimer.unref();
  }
}

module.exports = { flush, markDirty, clearTimers };
