'use strict';

const { createModerationStore } = require('./store/create-store');
const { createBlockedMatchersState } = require('./filters/blocked-matchers');
const { loadBlockedWordsFromFile } = require('./filters/blocked-words-file');
const { createDuplicateTrackerState, sweepDuplicateTracker, DUP_WINDOW_MS } = require('./filters/is-duplicate-recent');
const { createPolicy } = require('./policy');
const moderacionPolicyContract = require('../../core/contracts/moderacion-policy');
const mcpRegistry = require('../../core/contracts/mcp-registry');
const { resolveModTarget, resolveUntil } = require('./apply-mod-action');
const { DATA_BASE } = require('../../core/paths');

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

    bus.on('canal:follow', (payload) => {
      if (!payload) return;
      store.markFollower({ platform: payload.platform, userId: payload.userId, nick: payload.nick || payload.user });
    }, 'moderacion');

    // /chat (Fase 7) emite esto ya con el dato limpio {platform, userId, nick}
    // — canal:mensaje-crudo trae el dato crudo por plataforma (nombres de
    // campo distintos en TikTok/Twitch/YouTube) y parsearlo aca acoplaria
    // /moderacion a /canales.
    bus.on('chat:mensaje-recibido', (payload) => {
      if (!payload) return;
      store.touch({ platform: payload.platform, userId: payload.userId, nick: payload.nick });
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

    // ── MCP ──────────────────────────────────────────────────────────────
    mcpRegistry.registerStateProvider(() => {
      const s = store.stats();
      return { moderation: { viewers: s.total, followers: s.followers, muted: s.muted, banned: s.banned } };
    }, 'moderacion');

    mcpRegistry.registerTool({
      name: 'moderation_list_viewers', domain: 'moderacion', readOnly: true,
      title: 'List viewers',
      description: 'Tracked viewers with mute/ban/follower state. Local registry only.',
      inputSchema: {
        type: 'object',
        properties: {
          tab: { type: 'string', description: 'all | followers | others' },
          platform: { type: 'string', description: 'all | tiktok | twitch | youtube | kick' },
          q: { type: 'string', description: 'Search nick' },
          limit: { type: 'integer', description: 'Max rows (default 50, cap 200)' },
        },
      },
      handler: (a) => {
        const limit = Math.min(Number(a.limit) || 50, 200);
        return store.list({ tab: a.tab, platform: a.platform, q: a.q, limit });
      },
    });

    mcpRegistry.registerTool({
      name: 'moderation_get_stats', domain: 'moderacion', readOnly: true,
      title: 'Moderation stats',
      description: 'Aggregate counts: total viewers, followers, muted, banned, by platform.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => store.stats(),
    });

    const modAction = (accion, aplicar) => (a) => {
      const target = resolveModTarget(store, a);
      if (!target) return { ok: false, reason: 'target_no_resuelto', hint: 'pasá key o platform + (userId|nick)' };
      const until = accion === 'mute' || accion === 'ban' ? resolveUntil(a.durationMs) : undefined;
      if (until === null) return { ok: false, reason: 'durationMs_invalido' };
      const viewer = aplicar(target, until);
      store.flush();
      bus.emit('ws:broadcast', { type: 'moderation-updated', viewer });
      logger.log('info', 'moderacion', 'moderacion/index.js#mcp', 'moderacion.accion.aplicada',
        `Acción ${accion} via MCP`, { platform: target.platform, accion });
      return { ok: true, accion, target: target.key || `${target.platform}:${target.userId || target.nick}`, viewer };
    };
    const targetSchema = {
      type: 'object',
      properties: {
        key: { type: 'string', description: '"platform:userId"' },
        platform: { type: 'string' }, userId: { type: 'string' }, nick: { type: 'string' },
        durationMs: { type: 'integer', description: 'Omitir = permanente' },
      },
    };
    mcpRegistry.registerTool({
      name: 'moderation_mute', domain: 'moderacion', destructive: true,
      title: 'Mute viewer (local)',
      description: 'Local mute — the message is shown but not read by TTS. Does NOT touch the platform.',
      inputSchema: targetSchema,
      handler: modAction('mute', (t, until) => store.setMute(t, until)),
    });
    mcpRegistry.registerTool({
      name: 'moderation_ban', domain: 'moderacion', destructive: true,
      title: 'Ban viewer (local)',
      description: 'Local ban — the message is not emitted at all. Does NOT touch the platform.',
      inputSchema: targetSchema,
      handler: modAction('ban', (t, until) => store.setBan(t, until)),
    });
    mcpRegistry.registerTool({
      name: 'moderation_clear', domain: 'moderacion', destructive: true, idempotent: true,
      title: 'Clear punishments',
      description: 'Remove mute and ban for a viewer (keeps the record).',
      inputSchema: targetSchema,
      handler: modAction('clear', (t) => store.clearPunishments(t)),
    });

    return { rutas: 16, listeners: 2 };
  },

  shutdown() {
    if (storeInstance) storeInstance.shutdown();
  },
};
