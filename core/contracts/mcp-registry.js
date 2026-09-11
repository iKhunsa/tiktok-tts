'use strict';

// Registro de herramientas y proveedores de estado para el servidor MCP.
//
// Mismo patrón que core/contracts/perf.js: singleton eager, require-once, global
// por el require cache. La diferencia es que en vez de un método sobreescribible
// es un registro append-only — cada dominio agrega sus tools desde su propio
// register(), colocadas con la feature. features/mcp/ lo lee último (ya está
// registrado después de telemetria en server.js) y lo expone por el cable MCP.
//
//   const mcp = require('../../core/contracts/mcp-registry');
//   mcp.registerTool({ name: 'moderation_ban', domain: 'moderacion', destructive: true,
//     title: 'Ban viewer', description: '…', inputSchema: { type:'object', properties:{…} },
//     handler: (args) => { … } });
//
// Regla dura: toda feature nueva con rutas de escritura registra ≥1 tool
// (test/mcp-registry.test.js lo fuerza).

const tools = new Map();          // name -> def completo (con handler)
const stateProviders = [];        // [{ domain, fn }]
let logger = null;                // inyectado por features/mcp para poder loguear a GlitchTip

// Permite que features/mcp enganche el logger real. Opcional: sin él, los
// errores de registro solo se lanzan (los captura core/register-domain.js).
function attachLogger(l) {
  logger = l || null;
}

function logError(event, message, data) {
  if (logger) {
    try {
      logger.log('error', 'mcp', 'core/contracts/mcp-registry.js', event, message, data || {});
    } catch (_) { /* nunca romper por logging */ }
  }
}

// ── Validación de inputSchema (subset de JSON Schema que soportamos) ────────
// Objeto con `properties` de tipos primitivos/array y `required` opcional.
const TIPOS_VALIDOS = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object']);

function validarInputSchema(name, schema) {
  if (!schema || typeof schema !== 'object' || schema.type !== 'object') {
    return `inputSchema debe ser { type: 'object', properties: {...} }`;
  }
  const props = schema.properties || {};
  for (const [k, def] of Object.entries(props)) {
    if (!def || typeof def !== 'object') return `property "${k}" inválida`;
    if (def.type && !TIPOS_VALIDOS.has(def.type)) return `property "${k}" tipo no soportado: ${def.type}`;
  }
  if (schema.required && !Array.isArray(schema.required)) return `required debe ser array`;
  return null;
}

// Validación de args en runtime (defensa en profundidad; el gate real es Zod
// en features/mcp/transport). Chequea required presente + tipo primitivo.
function validarArgs(schema, args) {
  const props = (schema && schema.properties) || {};
  const required = (schema && schema.required) || [];
  for (const key of required) {
    if (args[key] === undefined || args[key] === null) return `falta el argumento requerido "${key}"`;
  }
  for (const [key, val] of Object.entries(args)) {
    const def = props[key];
    if (!def || !def.type) continue;
    const t = def.type;
    if (t === 'string' && typeof val !== 'string') return `"${key}" debe ser string`;
    if ((t === 'number' || t === 'integer') && typeof val !== 'number') return `"${key}" debe ser number`;
    if (t === 'boolean' && typeof val !== 'boolean') return `"${key}" debe ser boolean`;
    if (t === 'array' && !Array.isArray(val)) return `"${key}" debe ser array`;
  }
  return null;
}

// ── API ───────────────────────────────────────────────────────────────────

function registerTool(def) {
  if (!def || typeof def !== 'object') {
    throw new Error('mcp.registerTool: se requiere un objeto de definición');
  }
  const { name, title, description, inputSchema, handler } = def;
  if (!name || typeof name !== 'string') {
    throw new Error('mcp.registerTool: se requiere name (string)');
  }
  if (tools.has(name)) {
    logError('mcp.registro.tool_duplicada', `Tool "${name}" ya registrada (dominio ${def.domain})`, { name, domain: def.domain });
    throw new Error(`mcp.registerTool: nombre duplicado "${name}"`);
  }
  if (!title || !description) {
    throw new Error(`mcp.registerTool(${name}): se requieren title y description`);
  }
  if (typeof handler !== 'function') {
    throw new Error(`mcp.registerTool(${name}): se requiere handler (function)`);
  }
  const schemaErr = validarInputSchema(name, inputSchema);
  if (schemaErr) {
    logError('mcp.registro.schema_invalido', `Tool "${name}": ${schemaErr}`, { name, domain: def.domain, error: schemaErr });
    throw new Error(`mcp.registerTool(${name}): ${schemaErr}`);
  }

  tools.set(name, {
    name,
    title,
    description,
    inputSchema,
    domain: def.domain || 'desconocido',
    // `dev` es concepto nuestro (no MCP): tool solo para desarrollo, se filtra
    // del cable salvo que mcpDevToolsEnabled esté on. Ver features/mcp/dev-tools.js.
    dev: !!def.dev,
    annotations: {
      readOnlyHint: !!def.readOnly,
      destructiveHint: !!def.destructive,
      idempotentHint: !!def.idempotent,
      openWorldHint: !!def.openWorld,
    },
    handler,
  });
}

// Metadatos sin el handler (para tools/list y GET /api/mcp/info).
function listTools() {
  return [...tools.values()].map(({ handler, ...meta }) => meta);
}

async function callTool(name, args) {
  const tool = tools.get(name);
  if (!tool) {
    return { ok: false, error: { code: 'unknown_tool', message: `Tool desconocida: ${name}` } };
  }
  const argErr = validarArgs(tool.inputSchema, args || {});
  if (argErr) {
    return { ok: false, error: { code: 'invalid_args', message: argErr } };
  }
  try {
    const result = await tool.handler(args || {});
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: { code: 'handler_error', message: (e && e.message) || String(e), stack: e && e.stack },
    };
  }
}

function registerStateProvider(fn, domain) {
  if (typeof fn === 'function') stateProviders.push({ domain: domain || 'desconocido', fn });
}

// Fan-out síncrono: cada provider en su try/catch, shallow-merge. Los que
// lanzan van a out._errors + evento (features/mcp lo emite).
function collectState() {
  const out = {};
  const _errors = [];
  for (const { domain, fn } of stateProviders) {
    try {
      Object.assign(out, fn() || {});
    } catch (e) {
      _errors.push({ domain, message: (e && e.message) || String(e) });
    }
  }
  if (_errors.length) out._errors = _errors;
  return out;
}

// Solo tests.
function _reset() {
  tools.clear();
  stateProviders.length = 0;
  logger = null;
}

module.exports = {
  attachLogger,
  registerTool,
  listTools,
  callTool,
  registerStateProvider,
  collectState,
  _reset,
  _size: () => tools.size,
};
