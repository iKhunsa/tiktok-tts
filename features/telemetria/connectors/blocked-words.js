'use strict';

// Snapshot de la lista de palabras bloqueadas de la cuenta, SOLO si la cuenta
// activa tiene blockedWordsTelemetryEnabled (opt-in, default false). Con el interruptor
// apagado no emite nada. Plan: telemetria-tts/docs/PLAN-palabras-bloqueadas.md.
//
//  - Lee la lista por el bus ('moderacion:palabras-get'), sin importar moderacion/.
//  - Envia el estado completo (el servidor solo suma, nunca resta).
//  - Cuando: al arrancar/cambiar de cuenta/activar el interruptor si pasaron >7
//    dias; al cambiar la lista (debounce 10 min); y reenvio semanal. Mismo hash
//    y <7 dias => nada.
const { accountDataPath } = require('../../../core/account-data-path');
const { getConfigSnapshot } = require('../../../core/config-snapshot');
const { sanitizeWords, listHash } = require('../blocked-words/sanitize');
const { readSyncState, writeSyncState } = require('../blocked-words/sync-state');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEBOUNCE_MS = 10 * 60 * 1000;

function createSync({ bus, track, isEnabled, stateFile, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null;

  const stop = () => { if (timer) clearTimer(timer); timer = null; };
  const optedIn = () => getConfigSnapshot(bus).blockedWordsTelemetryEnabled === true;

  function send() {
    const config = getConfigSnapshot(bus);
    let raw = [];
    bus.emit('moderacion:palabras-get', (words) => { raw = words; });
    const words = sanitizeWords(raw);
    if (!words.length) return;

    const hash = listHash(words);
    const state = readSyncState(stateFile());
    const due = !state || now() - state.sentAt >= WEEK_MS;
    if (state && state.hash === hash && !due) return;

    track('moderation', 'blocked_words_snapshot', {
      words, lang: config.ttsVoiceLang || undefined, snapshot_at: new Date(now()).toISOString(), list_hash: hash,
    });
    writeSyncState(stateFile(), { hash, sentAt: now() });
  }

  // Reevalua: apagado => cero; sin runtime de telemetria no se marca como enviado.
  const guarded = () => { if (optedIn() && isEnabled()) send(); };

  function onListChanged() {
    stop();
    if (!optedIn()) return;
    timer = setTimer(() => { timer = null; guarded(); }, DEBOUNCE_MS);
    if (timer && timer.unref) timer.unref();
  }

  function check() {
    if (!optedIn() || !isEnabled()) return stop();
    const state = readSyncState(stateFile());
    if (!state || now() - state.sentAt >= WEEK_MS) return send();
    // Lista editada con la app cerrada: se entera por el hash, con el mismo debounce.
    if (!timer) onListChanged();
  }

  return { check, onListChanged, stop, send: guarded };
}

function attach(bus, track, { isEnabled = () => false } = {}) {
  const sync = createSync({ bus, track, isEnabled, stateFile: () => accountDataPath('blocked-words-telemetry.json') });

  bus.on('moderacion:palabras-cambiadas', sync.onListChanged, 'telemetria');
  bus.on('telemetry:ready', sync.check, 'telemetria');
  bus.on('telemetry:heartbeat', sync.check, 'telemetria');
  // Diferido un tick: al cambiar de cuenta, config y moderacion recargan dentro del
  // mismo emit; leer antes mezclaria la lista de una cuenta con el estado de otra.
  const later = () => setTimeout(sync.check, 0);
  bus.on('account:changed', () => { sync.stop(); later(); }, 'telemetria');
  bus.on('config:actualizado', (e) => {
    if (e && Array.isArray(e.keysChanged) && e.keysChanged.includes('blockedWordsTelemetryEnabled')) later();
  }, 'telemetria');
}

module.exports = { name: 'blocked-words', attach, createSync, WEEK_MS, DEBOUNCE_MS };
