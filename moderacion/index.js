'use strict';

const { createModerationStore } = require('./store/create-store');
const { createBlockedMatchersState } = require('./filters/blocked-matchers');
const { loadBlockedWordsFromFile } = require('./filters/blocked-words-file');
const { createDuplicateTrackerState, sweepDuplicateTracker, DUP_WINDOW_MS } = require('./filters/is-duplicate-recent');
const { createPolicy } = require('./policy');
const moderacionPolicyContract = require('../core/contracts/moderacion-policy');
const { DATA_BASE } = require('../core/paths');

const { preview } = require('./routes/preview');
const { viewers } = require('./routes/viewers');
const { stats } = require('./routes/stats');
const { mute } = require('./routes/mute');
const { unmute } = require('./routes/unmute');
const { ban } = require('./routes/ban');
const { unban } = require('./routes/unban');
const { clear } = require('./routes/clear');
const { follower } = require('./routes/follower');
const { deleteViewer } = require('./routes/delete-viewer');
const { deleteAllViewers } = require('./routes/delete-all-viewers');
const { blockedWordsGet } = require('./routes/blocked-words-get');
const { blockedWordsExport } = require('./routes/blocked-words-export');
const { blockedWordsImport } = require('./routes/blocked-words-import');
const { blockWord } = require('./routes/block-word');
const { unblockWord } = require('./routes/unblock-word');

const DUP_SWEEP_MS = 5 * 60 * 1000;

let storeInstance = null;

module.exports = {
  name: 'moderacion',

  register({ app, bus, logger }) {
    const store = createModerationStore({ dataDir: DATA_BASE, logger });
    storeInstance = store;
    const blockedMatchersState = createBlockedMatchersState();
    const dupState = createDuplicateTrackerState();
    loadBlockedWordsFromFile(blockedMatchersState, logger);

    const deps = { app, bus, logger, store, blockedMatchersState, dupState };

    const policy = createPolicy({ store, logger, bus, blockedMatchersState, dupState });
    // Inyeccion en tiempo de registro: /chat (Fase 7) consume la interfaz de
    // core/contracts/moderacion-policy.js sin importar moderacion/ directo.
    moderacionPolicyContract.evaluate = policy.evaluate;

    // canal:mensaje-crudo (Fase 6) trae el dato crudo por plataforma
    // (nombres de campo distintos en TikTok/Twitch/YouTube) — parsearlo
    // aca acoplaria /moderacion a /canales. /chat (Fase 7) ya normaliza el
    // mensaje a {platform, userId, nick, text} para llamar a policy.evaluate();
    // el store.touch() de "registrar interaccion" se hace ahi, con el dato
    // ya limpio, en vez de acá.
    bus.on('canal:follow', (payload) => {
      if (!payload) return;
      store.markFollower({ platform: payload.platform, userId: payload.userId, nick: payload.nick || payload.user });
    }, 'moderacion');

    const dupSweepTimer = setInterval(() => sweepDuplicateTracker(dupState), DUP_SWEEP_MS);
    if (dupSweepTimer.unref) dupSweepTimer.unref();

    app.post('/api/moderation/preview', preview(deps));
    app.get('/api/moderation/viewers', viewers(store));
    app.get('/api/moderation/stats', stats(store));
    app.post('/api/moderation/mute', mute(deps));
    app.post('/api/moderation/unmute', unmute(deps));
    app.post('/api/moderation/ban', ban(deps));
    app.post('/api/moderation/unban', unban(deps));
    app.post('/api/moderation/clear', clear(deps));
    app.post('/api/moderation/follower', follower(deps));
    app.delete('/api/moderation/viewer', deleteViewer(deps));
    app.delete('/api/moderation/viewers', deleteAllViewers(deps));
    app.get('/api/blocked-words', blockedWordsGet(blockedMatchersState));
    app.get('/api/blocked-words/export', blockedWordsExport(logger));
    app.post('/api/blocked-words/import', blockedWordsImport(deps));
    app.post('/api/block-word', blockWord(deps));
    app.delete('/api/block-word', unblockWord(deps));

    return { rutas: 16, listeners: 1 };
  },

  shutdown() {
    if (storeInstance) storeInstance.shutdown();
  },
};
