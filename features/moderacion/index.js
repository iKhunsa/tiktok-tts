'use strict';

const { createRegistryStore } = require('./persistence/create-registry-store');
const { loadBlockedWordsFromFile } = require('./filters/blocked-words-file');
const { loadAllowedWordsFromFile, saveAllowedWordsToFile } = require('./filters/allowed-words-file'); // rust-guard
const { normalizeWord } = require('./filters/normalize-word'); // rust-guard
const { rejectAllowedWord } = require('./filters/validate-allowed-word'); // rust-guard
const { createChatGuard, viewerKey } = require('@tiklivetts/chat-guard');
const { buildGuardOptions } = require('./build-guard-options');
const moderacionPolicyContract = require('../../core/contracts/moderacion-policy');
const mcpRegistry = require('../../core/contracts/mcp-registry');
const { resolveModTarget, resolveUntil } = require('./apply-mod-action');
const { accountDataDir } = require('../../core/account-data-path');
const { createRustGuard } = require('./rust-guard/create-rust-guard'); // rust-guard
const { loadEngine } = require('./rust-guard/load-engine'); // rust-guard
const { buildRustConfig } = require('./rust-guard/build-rust-config'); // rust-guard
const { createRustReviewer } = require('./rust-guard/review-with-rust'); // rust-guard

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
const { chatGuardStatus, describeChatGuard } = require('./routes/chat-guard-status'); // rust-guard
const { allowWord } = require('./routes/chat-guard-allow-word'); // rust-guard
const { disallowWord } = require('./routes/chat-guard-disallow-word'); // rust-guard

let storeInstance = null;
let rustGuardInstance = null;

module.exports = {
  name: 'moderacion',

  register({ app, bus, logger }) {
    const store = createRegistryStore({ dataDir: accountDataDir(), logger });
    storeInstance = store;
    const blockedWords = new Set();
    loadBlockedWordsFromFile(blockedWords, logger);
    const allowedWords = new Set(); // rust-guard
    loadAllowedWordsFromFile(allowedWords, logger); // rust-guard
    const moderation = { guard: null };
    const guardOptions = () => buildGuardOptions({ bus, blockedWords });
    const createGuard = () => createChatGuard({ registry: store.registry, ...guardOptions() });
    const rustGuard = createRustGuard({ logger, loadEngine }); // rust-guard
    rustGuardInstance = rustGuard; // rust-guard
    const reviewWithRust = createRustReviewer({ rustGuard, logger }); // rust-guard
    const configure = () => {
      moderation.guard.configure(guardOptions());
      rustGuard.sync(buildRustConfig({ bus, blockedWords, allowedWords })); // rust-guard
    };
    moderation.guard = createGuard();
    configure();

    bus.on('account:changing', () => store.flush(), 'moderacion');
    bus.on('account:changed', () => {
      store.switchDataDir(accountDataDir());
      blockedWords.clear();
      loadBlockedWordsFromFile(blockedWords, logger);
      allowedWords.clear(); // rust-guard
      loadAllowedWordsFromFile(allowedWords, logger); // rust-guard
      moderation.guard = createGuard();
      rustGuard.stop(); // rust-guard: hot-swap, el motor arranca de nuevo con la config de la cuenta
      configure();
      bus.emit('ws:broadcast', { type: 'moderation-reset' });
    }, 'moderacion');

    // Contrato por bus para telemetria (sin que importe internals de moderacion):
    // lectura sincrona de la lista por callback + aviso cuando una ruta la edita.
    bus.on('moderacion:palabras-get', (respond) => {
      if (typeof respond === 'function') respond([...blockedWords]);
    }, 'moderacion');
    const configureAndNotify = () => {
      configure();
      bus.emit('moderacion:palabras-cambiadas');
    };

    const deps = {
      app, bus, logger, store, blockedWords, allowedWords, rustGuard, moderation, guardOptions,
      configure: configureAndNotify, reconfigure: configure,
    };
    // Inyeccion en tiempo de registro: /chat (Fase 7) consume la interfaz de
    // core/contracts/moderacion-policy.js sin importar moderacion/ directo.
    moderacionPolicyContract.review = ({ platform, raw }) => {
      const verdict = reviewWithRust(moderation.guard.review({ platform, raw })); // rust-guard
      if (!verdict.message) return verdict;
      const key = viewerKey({ platform, id: verdict.message.author.id, handle: verdict.message.author.handle });
      const status = store.registry.statusOf(key);
      return { ...verdict, moderationKey: key, isFollower: status.isFollower || status.isWhitelisted };
    };
    bus.on('config:actualizado', configure, 'moderacion');

    bus.on('canal:follow', (payload) => {
      if (!payload) return;
      store.markFollower({ platform: payload.platform, userId: payload.userId, nick: payload.nick || payload.user });
    }, 'moderacion');

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
    app.get('/api/blocked-words', blockedWordsGet(blockedWords));
    app.get('/api/blocked-words/export', blockedWordsExport(logger));
    app.post('/api/blocked-words/import', blockedWordsImport(deps));
    app.post('/api/block-word', blockWord(deps));
    app.delete('/api/block-word', unblockWord(deps));
    app.get('/api/chat-guard/status', chatGuardStatus(deps)); // rust-guard
    app.post('/api/chat-guard/allowed-words', allowWord(deps)); // rust-guard
    app.delete('/api/chat-guard/allowed-words', disallowWord(deps)); // rust-guard

    // ── MCP ──────────────────────────────────────────────────────────────
    mcpRegistry.registerStateProvider(() => {
      const s = store.stats();
      return {
        moderation: { viewers: s.total, followers: s.followers, muted: s.muted, banned: s.banned },
        rustGuard: describeChatGuard(deps), // rust-guard
      };
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

    mcpRegistry.registerTool({ // rust-guard
      name: 'moderation_get_rust_guard_status', domain: 'moderacion', readOnly: true,
      title: 'Rust Chat Guard status',
      description: 'Native content-moderation engine: enabled, mode (shadow | enforce), running and engine version.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => describeChatGuard(deps),
    });

    const allowedWordSchema = { // rust-guard
      type: 'object',
      required: ['word'],
      properties: { word: { type: 'string', description: 'Single word (no spaces)' } },
    };
    mcpRegistry.registerTool({ // rust-guard
      name: 'chat_guard_allow_word', domain: 'moderacion', idempotent: true,
      title: 'Allow word (content filter)',
      description: 'Add a single word the native content filter never blocks. Rejected if it is in the blocked list.',
      inputSchema: allowedWordSchema,
      handler: (a) => {
        const word = normalizeWord(a.word);
        const rejection = rejectAllowedWord(word, blockedWords);
        if (rejection) return { ok: false, reason: rejection.errorKey };
        allowedWords.add(word);
        configure();
        saveAllowedWordsToFile(allowedWords, logger);
        return { ok: true, allowedWords: [...allowedWords].sort() };
      },
    });
    mcpRegistry.registerTool({ // rust-guard
      name: 'chat_guard_disallow_word', domain: 'moderacion', idempotent: true,
      title: 'Remove allowed word (content filter)',
      description: 'Remove a word from the content filter allowed list.',
      inputSchema: allowedWordSchema,
      handler: (a) => {
        allowedWords.delete(normalizeWord(a.word));
        configure();
        saveAllowedWordsToFile(allowedWords, logger);
        return { ok: true, allowedWords: [...allowedWords].sort() };
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

    return { rutas: 19, listeners: 2 };
  },

  shutdown() {
    if (rustGuardInstance) rustGuardInstance.stop(); // rust-guard
    if (storeInstance) storeInstance.shutdown();
  },
};
