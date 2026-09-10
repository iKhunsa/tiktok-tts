'use strict';

// GlitchTip #53 + #54: el WSServer comparte el http.Server, asi que un fallo de
// listen (EADDRINUSE — otra instancia / otro proceso en el puerto 3000) se emite
// por ambos y generaba DOS issues (error_arranque + error_websocket) por la misma
// causa. core/http-server.js ya reporta core.http.puerto_en_uso; el WS no duplica.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { createStubLogger } = require('./helpers/stub-logger');
const { createWsServer } = require('../core/ws-server');

function run(errCode) {
  const logger = createStubLogger();
  const server = http.createServer();
  const { wss } = createWsServer(server, new EventEmitter(), logger);
  wss.emit('error', Object.assign(new Error('boom'), errCode ? { code: errCode } : {}));
  server.close();
  return logger.entries.filter((e) => e.event === 'core.ws.servidor_error');
}

test('EADDRINUSE en el WSServer no genera core.ws.servidor_error (lo cubre http-server)', () => {
  assert.equal(run('EADDRINUSE').length, 0);
  assert.equal(run('EACCES').length, 0);
});

test('otros errores del WSServer SÍ se loguean', () => {
  assert.equal(run('ECONNRESET').length, 1);
  assert.equal(run(null).length, 1);
});
