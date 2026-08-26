'use strict';

const path = require('path');

const SCHEMA_VERSION = 1;
const FILE_NAME = 'moderation.json';

// Debounce largo a proposito: en un directo activo touch() se llama una vez
// por mensaje. Las acciones de moderacion no usan esto, hacen flush sincrono.
const DEBOUNCE_MS = 15000;
const MAX_DELAY_MS = 60000;
const SWEEP_MS = 15 * 60 * 1000;

const PLATFORMS = ['tiktok', 'twitch', 'youtube', 'kick'];

function createState({ dataDir, logger, maxViewers = 5000, purgeTarget = 4000 }) {
  const filePath = path.join(dataDir, FILE_NAME);
  return {
    logger,
    filePath,
    tmpPath: `${filePath}.tmp`,
    viewers: new Map(),
    dirty: false,
    debounceTimer: null,
    maxDelayTimer: null,
    sweepTimer: null,
    maxViewers,
    purgeTarget,
  };
}

module.exports = { createState, SCHEMA_VERSION, PLATFORMS, DEBOUNCE_MS, MAX_DELAY_MS, SWEEP_MS };
