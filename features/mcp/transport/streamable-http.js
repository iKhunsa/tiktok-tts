'use strict';

// Monta el endpoint MCP Streamable HTTP en el Express existente.
//
// Stateless: server + transport nuevos por request (sin session store). Encaja
// con el modelo de confianza local de la app. validateLocalMutation (core/app.js)
// ya 403ea un POST /mcp no-local, así que no hace falta carve-out todavía
// (el seam de token es Fase 4).

const { buildMcpServer } = require('./build-server');

/**
 * @param {import('express').Express} app
 * @param {{ isEnabled:()=>boolean, isDestructiveEnabled:()=>boolean, registry, logger, onRequest?:()=>void }} ctx
 * @returns {() => void}  cierre (no-op en stateless, se deja por simetría)
 */
function mountStreamableHttp(app, ctx) {
  const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

  async function handle(req, res) {
    if (typeof ctx.onRequest === 'function') { try { ctx.onRequest(); } catch (_) { /* noop */ } }

    ctx.logger.log(
      'debug', 'mcp', 'features/mcp/transport/streamable-http.js#handle', 'mcp.transport.request',
      `MCP ${req.method} /mcp`, { method: req.method }
    );

    if (!ctx.isEnabled()) {
      ctx.logger.log(
        'info', 'mcp', 'features/mcp/transport/streamable-http.js#handle', 'mcp.deshabilitado.rechazo',
        'Request a /mcp con mcpEnabled=false', { method: req.method }
      );
      return res.status(503).json({ error: 'MCP deshabilitado', errorKey: 'errors.mcpDisabled' });
    }

    let server;
    let transport;
    try {
      server = buildMcpServer({ registry: ctx.registry, destructiveEnabled: ctx.isDestructiveEnabled() });
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        try { transport.close(); } catch (_) { /* noop */ }
        try { server.close(); } catch (_) { /* noop */ }
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      ctx.logger.log(
        'error', 'mcp', 'features/mcp/transport/streamable-http.js#handle', 'mcp.transport.error',
        `Fallo manejando request MCP: ${err.message}`,
        { method: req.method, error: err.message, stack: err.stack }
      );
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
      try { if (transport) transport.close(); } catch (_) { /* noop */ }
      try { if (server) server.close(); } catch (_) { /* noop */ }
    }
  }

  app.post('/mcp', handle);
  app.get('/mcp', handle);
  app.delete('/mcp', handle);

  return () => {};
}

module.exports = { mountStreamableHttp };
