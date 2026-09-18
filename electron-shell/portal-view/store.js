'use strict';

const fs = require('fs');
const path = require('path');
const { accountDataPath } = require('../../core/account-data-path');
const { atomicWriteFileSync } = require('../../core/atomic-write');

// Metadata de UI (favoritos, pestanas abiertas, ancho del panel) — nunca
// cookies/sesion, eso lo resuelve Electron solo via session.js. Un solo
// archivo alcanza: puñado de campos planos, no justifica fraccionar como
// features/moderacion/store/ (miles de records con purge/LRU).
const SCHEMA_VERSION = 1;
function filePath() { return accountDataPath('portal-view.json'); }
const DEBOUNCE_MS = 2000;
const MAX_DELAY_MS = 10000;

const DEFAULT_DATA = { panelWidthPct: null, favorites: [], openTabs: [], activeTabId: null };

let debounceTimer = null;
let maxDelayTimer = null;

// Nunca lanza — se invoca al construir el controller, un throw aca rompería el arranque.
function loadPortalViewData(logger) {
  try {
    if (!fs.existsSync(filePath())) return { ...DEFAULT_DATA };
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (Number(parsed.version) !== SCHEMA_VERSION) return { ...DEFAULT_DATA };
    return {
      panelWidthPct: typeof parsed.panelWidthPct === 'number' ? parsed.panelWidthPct : null,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      openTabs: Array.isArray(parsed.openTabs) ? parsed.openTabs : [],
      activeTabId: typeof parsed.activeTabId === 'string' ? parsed.activeTabId : null,
    };
  } catch (error) {
    logger?.log(
      'warn', 'portal-view', 'portal-view/store.js#loadPortalViewData', 'portalview.store.lectura_fallida',
      `No se pudo leer portal-view.json: ${error.message}`, { error: error.message }
    );
    return { ...DEFAULT_DATA };
  }
}

function clearTimers() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (maxDelayTimer) clearTimeout(maxDelayTimer);
  debounceTimer = null;
  maxDelayTimer = null;
}

function writeSync(data, logger) {
  clearTimers();
  const payload = { version: SCHEMA_VERSION, savedAt: Date.now(), ...data };
  try {
    atomicWriteFileSync(filePath(), JSON.stringify(payload));
  } catch (error) {
    logger?.log(
      'error', 'portal-view', 'portal-view/store.js#writeSync', 'portalview.store.guardado_fallido',
      `No se pudo guardar portal-view.json: ${error.message}`, { error: error.message }
    );
  }
}

// Debounce + techo duro (mismo patron que features/moderacion/store/flush.js)
// — evita tocar disco en cada tab/titulo/ancho que cambia en rafaga. getData
// se llama recien cuando el timer dispara, nunca con el estado ya viejo.
function scheduleFlush(getData, logger) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => writeSync(getData(), logger), DEBOUNCE_MS);
  if (debounceTimer.unref) debounceTimer.unref();
  if (!maxDelayTimer) {
    maxDelayTimer = setTimeout(() => writeSync(getData(), logger), MAX_DELAY_MS);
    if (maxDelayTimer.unref) maxDelayTimer.unref();
  }
}

function flushSync(getData, logger) {
  writeSync(getData(), logger);
}

module.exports = { loadPortalViewData, scheduleFlush, flushSync };
