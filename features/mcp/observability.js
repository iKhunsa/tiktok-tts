'use strict';

// Decora mcpRegistry.callTool para que toda llamada emita un evento de log.
// Vía core/logger.js#133 esos eventos se espejan al bus como log:entry y los
// recogen GlitchTip (errores), Aptabase (mcp_tool_used) y telemetria — sin que
// el registro ni los dominios conozcan ninguno de esos sistemas.
//
//   info  mcp.tool.llamada    — ok
//   warn  mcp.tool.fallo      — fallo esperado (unknown_tool / invalid_args / {ok:false} deliberado)
//   error mcp.tool.excepcion  — el handler lanzó (bug) → GlitchTip lo fingerprintea (Fase 5)

function wrapWithObservability(registry, { logger }) {
  const orig = registry.callTool;
  registry.callTool = async function callToolObservado(name, args) {
    const t0 = Date.now();
    const out = await orig(name, args);
    const ms = Date.now() - t0;
    const argsKeys = args && typeof args === 'object' ? Object.keys(args) : [];

    if (out.ok) {
      logger.log('info', 'mcp', 'features/mcp/observability.js#callTool', 'mcp.tool.llamada',
        `MCP tool ${name} ok (${ms}ms)`, { tool: name, ms });
    } else if (out.error.code === 'handler_error') {
      logger.log('error', 'mcp', 'features/mcp/observability.js#callTool', 'mcp.tool.excepcion',
        `MCP tool ${name} lanzó: ${out.error.message}`,
        { tool: name, ms, code: out.error.code, argsKeys, stack: out.error.stack });
    } else {
      logger.log('warn', 'mcp', 'features/mcp/observability.js#callTool', 'mcp.tool.fallo',
        `MCP tool ${name} fallo (${out.error.code})`,
        { tool: name, ms, code: out.error.code });
    }
    return out;
  };
}

module.exports = { wrapWithObservability };
