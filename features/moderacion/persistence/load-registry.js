'use strict';

const fs = require('fs');
const path = require('path');
const { createViewerRegistry, migrateLegacyModeration } = require('@tiklivetts/chat-guard');

const REGISTRY_CAPACITY = 5000;

function loadRegistry(state) {
  state.registry = createViewerRegistry({ capacity: REGISTRY_CAPACITY });
  if (!fs.existsSync(state.filePath)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(state.filePath, 'utf8'));
    if (saved.version === 2) {
      state.registry = createViewerRegistry.fromJSON(saved, { capacity: REGISTRY_CAPACITY });
      return;
    }
    migrateLegacyRegistry(state, saved);
  } catch (error) {
    quarantineCorruptRegistry(state, error);
  }
}

function migrateLegacyRegistry(state, saved) {
  const migrated = migrateLegacyModeration(saved);
  fs.renameSync(state.filePath, path.join(state.dataDir, 'moderation.v1.json'));
  state.registry = createViewerRegistry.fromJSON(migrated, { capacity: REGISTRY_CAPACITY });
  state.dirty = true;
}

function quarantineCorruptRegistry(state, error) {
  try { fs.renameSync(state.filePath, `${state.filePath}.corrupt-${Date.now()}`); } catch { /* best effort */ }
  state.logger.log('warn', 'moderacion', 'moderacion/persistence/load-registry.js#loadRegistry', 'moderacion.store.carga_fallida', 'moderation.json invalido; se inicia vacio', { error: error.message });
}

module.exports = { loadRegistry };
