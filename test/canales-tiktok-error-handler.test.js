'use strict';

// Bug 03: conn.on('error') de TikTok recibe un objeto plano { info, exception }
// (no un Error). Antes leia err.message -> "undefined" en log y panel, y no
// agendaba reconexion tras una conexion ya establecida.

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

test('error post-conexion agenda una reconexion (backoff), sin duplicar si ya hay una en curso', () => {
  const { logger, estados, entry } = setup();
  entry.connectedOnce = true;

  entry.conn.emit('error', errShape);
  entry.conn.emit('error', errShape);

  const reconLogs = logger.entries.filter((e) => e.event === 'canales.tiktok.reconectando');
  assert.equal(reconLogs.length, 1, 'una sola reconexion agendada pese a dos errores');
  assert.ok(estados.some((p) => p.state === 'reconectando'));
  assert.ok(entry.timer, 'timer de reconexion armado');

  clearTimeout(entry.timer);
});

// GlitchTip #58: si readTikTokError deja `message` vacio, esErrorConexionEsperado
// (glitchtip.js) no puede matchear "isn't online" y un canal offline se reporta
// como issue + dispara la alerta de "sesion problematica".
for (const [nombre, err, esperado] of [
  ['Error con message vacio', Object.assign(new Error(), { message: '' }), 'Error'],
  ['string pelado', "The requested user isn't online :(", "The requested user isn't online :("],
  ['objeto solo con info', { info: "isn't online" }, "isn't online"],
  ['objeto raro sin nada util', {}, 'error desconocido'],
]) {
  test(`error "${nombre}": el log y canal:estado nunca traen undefined`, () => {
    const { logger, estados, entry } = setup();
    entry.connectedOnce = true;

    entry.conn.emit('error', err);

    const errLog = logger.entries.find((e) => e.event === 'canales.tiktok.error');
    assert.ok(errLog && !/undefined/.test(errLog.message), errLog && errLog.message);
    assert.equal(errLog.data.error, esperado);
    const errEstado = estados.find((p) => p.state === 'error');
    assert.equal(errEstado.error, esperado);

    if (entry.timer) clearTimeout(entry.timer);
  });
}

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
