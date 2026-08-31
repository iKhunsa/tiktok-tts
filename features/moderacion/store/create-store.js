'use strict';

const { createState, SWEEP_MS } = require('./state');
const { keyFor } = require('./key-for');
const { parseKey } = require('./parse-key');
const { load } = require('./load');
const { flush } = require('./flush');
const { touch } = require('./touch');
const { markFollower } = require('./mark-follower');
const { get } = require('./get');
const { getEffective } = require('./get-effective');
const { toDTO } = require('./to-dto');
const { list } = require('./list');
const { stats } = require('./stats');
const { setMute } = require('./set-mute');
const { setBan } = require('./set-ban');
const { clearPunishments } = require('./clear-punishments');
const { setWhitelist } = require('./set-whitelist');
const { remove } = require('./remove');
const { clearAll } = require('./clear-all');
const { sweepExpired } = require('./sweep-expired');
const { shutdown } = require('./shutdown');

/**
 * Registro persistente de espectadores + moderacion por usuario. Migracion
 * de backend-viejo/moderation-store.js (mismo esquema de moderation.json,
 * mismo comportamiento) — cada funcion vive en su propio archivo, todas
 * operan sobre el mismo `state` compartido en vez de un closure implicito.
 */
function createModerationStore(opts = {}) {
  const state = createState(opts);

  load(state);

  state.sweepTimer = setInterval(() => sweepExpired(state), SWEEP_MS);
  if (state.sweepTimer.unref) state.sweepTimer.unref();

  return {
    filePath: state.filePath,
    keyFor,
    parseKey,
    touch: (target) => touch(state, target),
    markFollower: (target) => markFollower(state, target),
    get: (key) => get(state, key),
    getEffective: (key) => getEffective(state, key),
    toDTO: (key, v) => toDTO(state, key, v),
    list: (query) => list(state, query),
    stats: () => stats(state),
    setMute: (target, until) => setMute(state, target, until),
    setBan: (target, until) => setBan(state, target, until),
    clearPunishments: (target) => clearPunishments(state, target),
    setWhitelist: (target, value) => setWhitelist(state, target, value),
    remove: (key) => remove(state, key),
    clearAll: () => clearAll(state),
    load: () => load(state),
    flush: () => flush(state),
    sweepExpired: () => sweepExpired(state),
    shutdown: () => shutdown(state),
    get size() { return state.viewers.size; },
  };
}

module.exports = { createModerationStore };
