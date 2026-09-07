'use strict';

// Construye un McpServer a partir del registro de tools. Se llama una vez por
// request HTTP (transporte stateless).

const path = require('path');
const { jsonSchemaToZodShape } = require('./schema-adapter');

const APP_VERSION = (() => {
  try { return require(path.join(__dirname, '..', '..', '..', 'package.json')).version; }
  catch (_) { return '0'; }
})();

/**
 * @param {{ registry, destructiveEnabled:boolean }} ctx
 */
function buildMcpServer(ctx) {
  const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
  const server = new McpServer({ name: 'tiktok-tts', version: APP_VERSION });

  for (const meta of ctx.registry.listTools()) {
    // Si las tools destructivas están apagadas, no se exponen por el cable.
    if (meta.annotations.destructiveHint && !ctx.destructiveEnabled) continue;
    // Tools de desarrollo: solo con mcpDevToolsEnabled on.
    if (meta.dev && !ctx.devEnabled) continue;

    server.registerTool(
      meta.name,
      {
        title: meta.title,
        description: `[${meta.domain}] ${meta.description}`,
        inputSchema: jsonSchemaToZodShape(meta.inputSchema),
        annotations: meta.annotations,
      },
      async (args) => {
        const out = await ctx.registry.callTool(meta.name, args || {});
        if (!out.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify({ error: out.error.code, message: out.error.message }) }],
          };
        }
        const text = typeof out.result === 'string' ? out.result : JSON.stringify(out.result);
        return { content: [{ type: 'text', text }] };
      }
    );
  }

  return server;
}

module.exports = { buildMcpServer, APP_VERSION };
