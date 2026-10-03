'use strict';

const fs = require('fs');
const { atomicWriteFileSync } = require('../../../core/atomic-write');

// Ultimo envio de la cuenta activa: { hash, sentAt (ms) }. Nunca lanza: un
// archivo ausente o corrupto equivale a "nunca se envio" y solo cuesta un reenvio.
function readSyncState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof parsed.hash === 'string' && Number.isFinite(parsed.sentAt)) return parsed;
  } catch (_) { /* sin estado previo */ }
  return null;
}

function writeSyncState(file, state) {
  try {
    atomicWriteFileSync(file, JSON.stringify(state));
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { readSyncState, writeSyncState };
