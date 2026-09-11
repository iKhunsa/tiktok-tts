'use strict';

// Tools MCP de DESARROLLO — para debuggear/testear la app por MCP nativo sin
// tocar la UI ni el Electron. TODAS marcadas `dev: true`: no se exponen por el
// cable salvo que `mcpDevToolsEnabled` (config, default false) o el env
// `MCP_DEV_TOOLS` estén activos. No hay datos de usuario reales acá — es un
// entorno de test.

const mcpRegistry = require('../../core/contracts/mcp-registry');

const PORT = process.env.PORT || 3000;

// Prefijos de eventos de bus que dev_bus_emit puede disparar. Deja afuera lo
// que rompe el server (ws:mensaje-entrante, shutdown, etc.).
const BUS_EMIT_PERMITIDO = [
  'canal:', 'chat:', 'overlay:', 'sonido:', 'movil:', 'mcp:', 'promo:', 'clips:',
  'config:get', 'config:patch', 'canales:',
];

async function selfCall(path, body) {
  const opts = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, opts);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = { raw: text.slice(0, 500) }; }
  return { ok: r.ok, status: r.status, body: json };
}

function registerDevTools({ bus, logger, wss }) {
  // ── dev_status ──────────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_status', domain: 'mcp', dev: true, readOnly: true,
    title: '[dev] Full status',
    description: 'Everything at once: /api/status + channels + platforms + oauth + music queue/engine + moderation stats + overlay stats + mcp info + ws client count.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const paths = [
        ['status', '/api/status'], ['channels', '/api/channels'], ['platforms', '/api/platforms/status'],
        ['oauth', '/api/oauth/status'], ['musicQueue', '/api/music/queue'], ['musicEngine', '/api/music/engine'],
        ['moderationStats', '/api/moderation/stats'], ['overlayStats', '/api/overlay-stats'],
        ['mcp', '/api/mcp/info'],
      ];
      const out = {};
      await Promise.all(paths.map(async ([k, p]) => {
        try { out[k] = (await selfCall(p)).body; } catch (e) { out[k] = { error: e.message }; }
      }));
      out.wsClients = wss ? [...wss.clients].filter((c) => c.readyState === 1).length : null;
      out.wsDesktop = wss ? [...wss.clients].some((c) => c.isDesktop && c.readyState === 1) : null;
      out.memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      out.pid = process.pid;
      return out;
    },
  });

  // ── dev_inject_chat ─────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_inject_chat', domain: 'mcp', dev: true,
    title: '[dev] Inject chat message',
    description: 'Inject a synthetic chat message through the FULL pipeline (moderation → chat:mensaje-permitido → TTS/overlay). Same as POST /api/test/chat.',
    inputSchema: {
      type: 'object', required: ['comment'],
      properties: {
        comment: { type: 'string' },
        platform: { type: 'string', description: 'tiktok | twitch | youtube (default tiktok)' },
        user: { type: 'string', description: 'nick (default TestUser)' },
        userId: { type: 'string' },
      },
    },
    handler: (a) => selfCall('/api/test/chat', {
      comment: a.comment, platform: a.platform, user: a.user, userId: a.userId,
    }),
  });

  // ── dev_inject_event ────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_inject_event', domain: 'mcp', dev: true,
    title: '[dev] Inject stream event',
    description: 'Fire a synthetic stream event: gift | follow | share | sub | cheer | raid | likes. Runs the real overlay/telemetry chain.',
    inputSchema: {
      type: 'object', required: ['kind'],
      properties: {
        kind: { type: 'string', description: 'gift|follow|share|sub|cheer|raid|likes' },
        platform: { type: 'string', description: 'for follow: tiktok|twitch' },
        user: { type: 'string' },
      },
    },
    handler: (a) => {
      const KINDS = new Set(['gift', 'follow', 'share', 'sub', 'cheer', 'raid', 'likes']);
      if (!KINDS.has(a.kind)) return { ok: false, reason: 'kind_invalido', validos: [...KINDS] };
      const body = a.kind === 'follow' ? { platform: a.platform, user: a.user } : (a.user ? { user: a.user } : undefined);
      return selfCall(`/api/test/${a.kind}`, body || {});
    },
  });

  // ── dev_logs ────────────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_logs', domain: 'mcp', dev: true, readOnly: true,
    title: '[dev] Raw logs',
    description: 'Log ring buffer entries WITH the data field, filterable. Richer than get_activity.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', description: '1-250, default 50' },
        level: { type: 'string', description: 'min level: debug|info|warn|error|fatal' },
        domain: { type: 'string' },
        event: { type: 'string', description: 'exact event id' },
        grep: { type: 'string', description: 'substring en message o event' },
      },
    },
    handler: (a) => {
      const orden = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
      const minLvl = a.level ? (orden[a.level] ?? 0) : -1;
      let rows = logger.getBuffer();
      if (minLvl >= 0) rows = rows.filter((e) => (orden[e.level] ?? 0) >= minLvl);
      if (a.domain) rows = rows.filter((e) => e.domain === a.domain);
      if (a.event) rows = rows.filter((e) => e.event === a.event);
      if (a.grep) {
        const q = a.grep.toLowerCase();
        rows = rows.filter((e) => (e.message || '').toLowerCase().includes(q) || (e.event || '').toLowerCase().includes(q));
      }
      const n = Math.max(1, Math.min(Number(a.limit) || 50, 250));
      return { total: rows.length, entries: rows.slice(-n) };
    },
  });

  // ── dev_ws_send ─────────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_ws_send', domain: 'mcp', dev: true,
    title: '[dev] WS broadcast',
    description: 'Emit a raw ws:broadcast to all connected clients. For poking overlays / the UI directly (e.g. {type:"toast", message:"hi"}).',
    inputSchema: {
      type: 'object', required: ['type'],
      properties: { type: { type: 'string' }, payload: { type: 'object' } },
    },
    handler: (a) => {
      bus.emit('ws:broadcast', { type: a.type, ...(a.payload || {}) });
      logger.log('info', 'mcp', 'features/mcp/dev-tools.js#dev_ws_send', 'mcp.dev.ws_send',
        `dev_ws_send type=${a.type}`, { type: a.type });
      return { ok: true, sent: { type: a.type, ...(a.payload || {}) } };
    },
  });

  // ── dev_bus_emit ────────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_bus_emit', domain: 'mcp', dev: true,
    title: '[dev] Raw bus emit',
    description: `Emit a raw event on the domain bus. Allowed prefixes: ${BUS_EMIT_PERMITIDO.join(', ')}. Every call is logged.`,
    inputSchema: {
      type: 'object', required: ['event'],
      properties: { event: { type: 'string' }, payload: { type: 'object' } },
    },
    handler: (a) => {
      if (!BUS_EMIT_PERMITIDO.some((p) => a.event === p || a.event.startsWith(p))) {
        return { ok: false, reason: 'evento_no_permitido', permitidos: BUS_EMIT_PERMITIDO };
      }
      logger.log('warn', 'mcp', 'features/mcp/dev-tools.js#dev_bus_emit', 'mcp.dev.bus_emit',
        `dev_bus_emit ${a.event}`, { event: a.event });
      bus.emit(a.event, a.payload);
      return { ok: true, emitted: a.event };
    },
  });

  // ── dev_selftest ────────────────────────────────────────────────────────
  mcpRegistry.registerTool({
    name: 'dev_selftest', domain: 'mcp', dev: true, readOnly: true,
    title: '[dev] Self-test MCP surface',
    description: 'Calls every read-only MCP tool once and reports ok/error per tool. One-shot "is the whole MCP surface alive".',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const results = [];
      for (const meta of mcpRegistry.listTools()) {
        if (!meta.annotations.readOnlyHint) continue;
        if (meta.name === 'dev_selftest') continue;
        const started = process.hrtime.bigint();
        const out = await mcpRegistry.callTool(meta.name, {});
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        results.push({ tool: meta.name, ok: out.ok, ms: Math.round(ms), error: out.ok ? undefined : out.error.code });
      }
      const failed = results.filter((r) => !r.ok);
      return { total: results.length, ok: failed.length === 0, failed, results };
    },
  });

  logger.log('info', 'mcp', 'features/mcp/dev-tools.js#registerDevTools', 'mcp.dev.tools_registradas',
    'Tools MCP de desarrollo registradas (dev: true)', { count: 7 });
}

module.exports = { registerDevTools, BUS_EMIT_PERMITIDO };
