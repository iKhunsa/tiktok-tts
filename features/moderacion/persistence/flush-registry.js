'use strict';

const { atomicWriteFileSync } = require('../../../core/atomic-write');

function flushRegistry(state) {
  clearTimeout(state.debounceTimer);
  clearTimeout(state.maximumTimer);
  state.debounceTimer = null;
  state.maximumTimer = null;
  if (!state.dirty) return true;
  try {
    atomicWriteFileSync(state.filePath, JSON.stringify(state.registry.toJSON()));
    state.dirty = false;
    return true;
  } catch (error) {
    state.logger.log('error', 'moderacion', 'moderacion/persistence/flush-registry.js#flushRegistry', 'moderacion.store.guardado_fallido', 'No se pudo guardar moderation.json', { error: error.message });
    return false;
  }
}

module.exports = { flushRegistry };
