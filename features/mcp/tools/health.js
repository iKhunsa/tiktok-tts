'use strict';

const { APP_VERSION } = require('../transport/build-server');

// Protocolo MCP soportado por el SDK pinneado. Se actualiza a mano al bumpear
// @modelcontextprotocol/sdk (ver features/mcp/PROTOCOL.md).
const PROTOCOL_VERSION = '2025-06-18';

function health({ mcpRegistry, isEnabled }) {
  return {
    ok: true,
    appVersion: APP_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    toolCount: mcpRegistry.listTools().length,
    mcpEnabled: isEnabled(),
    timestamp: new Date().toISOString(),
  };
}

module.exports = health;
module.exports.PROTOCOL_VERSION = PROTOCOL_VERSION;
