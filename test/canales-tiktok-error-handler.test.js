'use strict';

// Bug 03: conn.on('error') de TikTok recibe un objeto plano { info, exception }
// (no un Error). Antes leia err.message -> "undefined" en log y panel.
// Un 'error' post-conexion NO agenda reconexion a proposito: 'error' es un
// cajon de sastre (incluye fallos de decode de un frame con el socket sano) y
// la recuperacion real la cubren 'disconnected' + el stale-watchdog de 5 min.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createChannelState } = require('../features/canales/state/channel-maps');
const { createStubLogger } = require('./helpers/stub-logger');
const { setupTikTokConnection } = require('../features/canales/tiktok/connect-tiktok-channel');

function setup() {
  const state = createChannelState();
  const logger = createStubLogger();
  const bus = new EventEmitter();
  const estados = [];
  bus.on('canal:estado', (p) => estados.push(p));
  const deps = { state, bus, logger };
  setupTikTokConnection(deps, 'ana');
  const entry = state.tiktokChannels.get('ana');
  return { state, logger, estados, entry, deps };
}

const errShape = { info: 'WebSocket Error', exception: new Error('boom') };

test('error con shape {info,exception}: log y canal:estado traen el texto real, nunca undefined', () => {
  const { logger, estados, entry } = setup();
  entry.connectedOnce = true;

  entry.conn.emit('error', errShape);

  const errLog = logger.entries.find((e) => e.event === 'canales.tiktok.error');
  assert.ok(errLog, 'se logueo canales.tiktok.error');
  assert.ok(!errLog.message.includes('undefined'), errLog.message);
  assert.equal(errLog.data.error, 'boom');
  assert.ok(errLog.data.stack && errLog.data.stack.includes('Error: boom'), 'stack real');

  const errEstado = estados.find((p) => p.state === 'error');
  assert.equal(errEstado.error, 'boom');

  if (entry.timer) clearTimeout(entry.timer);
});

test('error post-conexion NO agenda reconexion (lo cubren disconnected + watchdog)', () => {
  const { logger, estados, entry } = setup();
  entry.connectedOnce = true;

  entry.conn.emit('error', errShape);
  entry.conn.emit('error', errShape);

  assert.equal(
    logger.entries.filter((e) => e.event === 'canales.tiktok.reconectando').length, 0,
    'un error post-conexion no dispara reconexion'
  );
  assert.ok(!entry.timer, 'no se armo timer de reconexion');
  assert.ok(!estados.some((p) => p.state === 'reconectando'), 'no se emitio estado reconectando');
  // pero el error sí se reporta
  assert.ok(logger.entries.some((e) => e.event === 'canales.tiktok.error'));
  assert.ok(estados.some((p) => p.state === 'error' && p.error === 'boom'));
});

test('error pre-conexion (nunca conecto): teardown, sin reintento', () => {
  const { state, logger, estados } = setup();
  const entry = state.tiktokChannels.get('ana');
  assert.equal(entry.connectedOnce, false);

  entry.conn.emit('error', errShape);

  assert.equal(state.tiktokChannels.has('ana'), false, 'entrada removida');
  assert.equal(
    logger.entries.some((e) => e.event === 'canales.tiktok.reconectando'), false,
    'no se agendo reconexion'
  );
  assert.ok(estados.some((p) => p.state === 'sin-canales'), 'cleanup corrio');
  assert.equal(entry.timer, null);
});
