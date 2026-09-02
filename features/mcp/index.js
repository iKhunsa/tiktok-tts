'use strict';

// Dominio MCP — expone las capacidades de la app como tools para agentes
// (Claude Code / Claude Desktop) vía Model Context Protocol sobre Streamable
// HTTP (POST /mcp).
//
// Se registra ÚLTIMO en server.js: para entonces cada dominio ya llamó
// mcpRegistry.registerTool() desde su propio register(), así que el set de
// tools crece solo con cada feature nueva — este archivo nunca se toca.

const mcpRegistry = require('../../core/contracts/mcp-registry');
const { mountStreamableHttp } = require('./transport/streamable-http');
const { createActivityBuffer } = require('./state/activity-buffer');
const { wrapWithObservability } = require('./observability');
const getState = require('./tools/get-state');
const getRecentChat = require('./tools/get-recent-chat');
const getActivity = require('./tools/get-activity');
const health = require('./tools/health');

module.exports = {
  name: 'mcp',

  register({ app, bus, logger }) {
    mcpRegistry.attachLogger(logger);

    const activity = createActivityBuffer({ cap: 300 });
    bus.on('log:entry', (e) => activity.push(e), 'mcp');

    // Estado de config relevante, refrescado por el bus.
    const cfg = { mcpEnabled: true, mcpDestructiveToolsEnabled: false };
    const leerConfig = () => {
      try {
        bus.emit('config:get', (c) => {
          if (c && typeof c.mcpEnabled === 'boolean') cfg.mcpEnabled = c.mcpEnabled;
          if (c && typeof c.mcpDestructiveToolsEnabled === 'boolean') cfg.mcpDestructiveToolsEnabled = c.mcpDestructiveToolsEnabled;
        });
      } catch (_) { /* noop */ }
    };
    leerConfig();
    bus.on('config:actualizado', ({ keysChanged }) => {
      if (Array.isArray(keysChanged) && (keysChanged.includes('mcpEnabled') || keysChanged.includes('mcpDestructiveToolsEnabled'))) {
        leerConfig();
      }
    }, 'mcp');

    // Providers de estado que respondan al idiom de bus (demo — overlay lo usa).
    bus.on('mcp:state', (respond) => {
      if (typeof respond === 'function') respond(mcpRegistry.collectState());
    }, 'mcp');

    // Contador liviano de requests para la UI ("actividad reciente").
    let reqCount = 0;
    let lastReqTs = null;

    // ── Tools core (propias del dominio mcp) ──────────────────────────────
    mcpRegistry.registerTool({
      name: 'get_state', domain: 'mcp', readOnly: true,
      title: 'Get app state',
      description: 'Consolidated snapshot: channels, music, moderation counts, overlay, config.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => getState({ bus }),
    });
    mcpRegistry.registerTool({
      name: 'get_recent_chat', domain: 'mcp', readOnly: true,
      title: 'Recent chat',
      description: 'Last N chat messages across all connected platforms.',
      inputSchema: { type: 'object', properties: { limit: { type: 'integer', description: 'Max messages (1-200, default 50)' } } },
      handler: (a) => getRecentChat({ bus }, a),
    });
    mcpRegistry.registerTool({
      name: 'get_activity', domain: 'mcp', readOnly: true,
      title: 'Activity feed',
      description: 'Recent internal log events across all domains (level: debug|info|warn|error).',
      inputSchema: { type: 'object', properties: { limit: { type: 'integer' }, level: { type: 'string' } } },
      handler: (a) => getActivity({ activity }, a),
    });
    mcpRegistry.registerTool({
      name: 'health', domain: 'mcp', readOnly: true,
      title: 'MCP health',
      description: 'MCP server + app health, protocol version, tool count.',
      inputSchema: { type: 'object', properties: {} },
      handler: () => health({ mcpRegistry, isEnabled: () => cfg.mcpEnabled }),
    });

    // Observabilidad: decora callTool para emitir mcp.tool.* al bus.
    wrapWithObservability(mcpRegistry, { logger });

    // Emitir evento por cada provider de estado que lance (Fase 5 lo promueve).
    const origCollect = mcpRegistry.collectState;
    mcpRegistry.collectState = function collectStateObservado() {
      const out = origCollect();
      if (out._errors && out._errors.length) {
        for (const e of out._errors) {
          logger.log('error', 'mcp', 'features/mcp/index.js#collectState', 'mcp.estado.provider_fallido',
            `State provider de "${e.domain}" lanzó: ${e.message}`, { domain: e.domain, error: e.message });
        }
      }
      return out;
    };

    // ── Transporte ───────────────────────────────────────────────────────
    mountStreamableHttp(app, {
      isEnabled: () => cfg.mcpEnabled,
      isDestructiveEnabled: () => cfg.mcpDestructiveToolsEnabled,
      registry: mcpRegistry,
      logger,
      onRequest: () => { reqCount++; lastReqTs = Date.now(); },
    });

    // Endpoint de conveniencia para la UI de la tienda (GET, sin barrera de auth).
    app.get('/api/mcp/info', (_req, res) => {
      res.json({
        enabled: cfg.mcpEnabled,
        destructiveEnabled: cfg.mcpDestructiveToolsEnabled,
        endpoint: '/mcp',
        protocolVersion: health.PROTOCOL_VERSION,
        version: require('../../package.json').version,
        tools: mcpRegistry.listTools(),
        recentRequests: reqCount,
        lastRequestAt: lastReqTs ? new Date(lastReqTs).toISOString() : null,
      });
    });

    logger.log('info', 'mcp', 'features/mcp/index.js#register', 'mcp.dominio.listo',
      `MCP montado — ${mcpRegistry.listTools().length} tools, mcpEnabled=${cfg.mcpEnabled}`,
      { tools: mcpRegistry.listTools().length, enabled: cfg.mcpEnabled });

    return { rutas: 4, listeners: 3 };
  },
};
