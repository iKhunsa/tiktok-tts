'use strict';

const fs = require('fs');
const { SCHEMA_VERSION } = require('./state');
const { parseKey } = require('./parse-key');
const { normalizeRecord } = require('./normalize-record');
const { backupAndReset } = require('./backup-and-reset');
const { purge } = require('./purge');

/** Nunca lanza: se invoca al registrar el dominio, un throw aca rompería el arranque. */
function load(state) {
  state.viewers.clear();

  let raw;
  try {
    if (!fs.existsSync(state.filePath)) return;
    raw = fs.readFileSync(state.filePath, 'utf8');
  } catch (error) {
    state.logger.log(
      'warn', 'moderacion', 'moderacion/store/load.js#load', 'moderacion.store.lectura_fallida',
      `No se pudo leer moderation.json: ${error.message}`, { path: state.filePath, error: error.message }
    );
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    backupAndReset(state, `corrupt-${Date.now()}`, `json invalido: ${error.message}`);
    return;
  }

  const version = Number(parsed && parsed.version);
  if (version !== SCHEMA_VERSION) {
    // Solo puede ser una version futura (escrita por una app mas nueva).
    // Degradarla en silencio perdería castigos, asi que se aparta el archivo.
    backupAndReset(state, `v${version || 0}.bak`, 'version desconocida');
    return;
  }

  const entries = parsed.viewers && typeof parsed.viewers === 'object' ? parsed.viewers : {};
  for (const [key, v] of Object.entries(entries)) {
    if (!v || typeof v !== 'object') continue;
    if (!parseKey(key)) continue;
    state.viewers.set(key, normalizeRecord(key, v));
  }

  purge(state);
  state.logger.log(
    'info', 'moderacion', 'moderacion/store/load.js#load', 'moderacion.store.cargado',
    `moderation.json cargado con ${state.viewers.size} viewer(s)`, { viewers: state.viewers.size }
  );
}

module.exports = { load };
