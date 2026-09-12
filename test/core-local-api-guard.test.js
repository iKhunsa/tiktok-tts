'use strict';

// El servidor HTTP se expone en la LAN para el panel móvil. Esta suite protege
// la frontera que separa ese panel de las APIs de escritorio: Host y Origin
// son headers falsificables, así que la decisión debe salir del socket real.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateLocalApiRequest,
  getMcpToken,
  hasValidBearerToken,
} = require('../core/app');
const { isAllowedWsClient } = require('../core/ws-server');

function runGuard({ requestPath, method = 'GET', host = 'localhost', origin, remoteAddress = '127.0.0.1', authorization } = {}) {
  let advanced = false;
  let statusCode = null;
  let body = null;
  const headers = { host };
  if (origin !== undefined) headers.origin = origin;
  if (authorization !== undefined) headers.authorization = authorization;
  const req = { path: requestPath, method, headers, socket: { remoteAddress } };
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  validateLocalApiRequest(req, res, () => { advanced = true; });
  return { advanced, statusCode, body };
}

test('una IP remota no puede falsificar Host localhost para leer o mutar /api', () => {
  for (const method of ['GET', 'POST']) {
    const result = runGuard({
      requestPath: method === 'GET' ? '/api/auth/session' : '/api/config',
      method,
      host: 'localhost',
      remoteAddress: '203.0.113.7',
    });
    assert.equal(result.advanced, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.body.error, 'Acceso local requerido');
  }
});

test('una solicitud de escritorio real acepta IPv4 mapeada en IPv6', () => {
  const result = runGuard({
    requestPath: '/api/config',
    method: 'PATCH',
    host: '127.0.0.1:3000',
    origin: 'http://localhost:3000',
    remoteAddress: '::ffff:127.0.0.1',
  });
  assert.equal(result.advanced, true);
});

test('las rutas del panel móvil conservan el guard específico de LAN', () => {
  const result = runGuard({
    requestPath: '/api/mobile/command',
    method: 'POST',
    host: '192.168.1.10:3000',
    remoteAddress: '192.168.1.44',
  });
  assert.equal(result.advanced, true);
});

test('MCP remoto requiere un bearer y usa comparación de longitud constante', () => {
  const previous = process.env.MCP_TOKEN;
  process.env.MCP_TOKEN = 'test-mcp-token';
  try {
    assert.equal(runGuard({ requestPath: '/mcp', remoteAddress: '203.0.113.7' }).statusCode, 401);
    assert.equal(runGuard({
      requestPath: '/mcp', remoteAddress: '203.0.113.7', authorization: 'Bearer test-mcp-token', host: 'remote.example',
    }).advanced, true);
    assert.equal(hasValidBearerToken('Bearer other-token', 'test-mcp-token'), false);
  } finally {
    if (previous === undefined) delete process.env.MCP_TOKEN;
    else process.env.MCP_TOKEN = previous;
  }
});

test('el token MCP documentado puede vivir en mcp.json del usuario', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-mcp-token-'));
  const file = path.join(dir, 'mcp.json');
  try {
    fs.writeFileSync(file, JSON.stringify({ token: 'from-user-file' }));
    assert.equal(getMcpToken({ env: {}, file }), 'from-user-file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('WS también usa la IP real, no un Host falsificado', () => {
  const info = (remoteAddress, host = 'localhost', origin) => ({
    req: { headers: { host, ...(origin ? { origin } : {}) }, socket: { remoteAddress } },
    origin,
  });
  assert.equal(isAllowedWsClient(info('203.0.113.7')), false, 'un Host localhost no vuelve local a un cliente público');
  assert.equal(isAllowedWsClient(info('192.168.1.44', '192.168.1.10:3000', 'http://192.168.1.10:3000')), true);
  assert.equal(isAllowedWsClient(info('::ffff:127.0.0.1', 'localhost:3000', 'http://localhost:3000')), true);
});
