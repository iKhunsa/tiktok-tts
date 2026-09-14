'use strict';

// Bug 03: conn.on('error') de TikTok recibe un objeto plano { info, exception }
// (no un Error). Antes leia err.message -> "undefined" en log y panel.
//
// Supervisor de continuidad (ver CLAUDE.md / handoff): 'error' es un cajon de
// sastre (incluye fallos de decode de un frame con el socket sano) — SOLO se
// loguea para diagnostico, nunca dispara recuperacion ni se muestra al
// usuario como "canal:estado" (eso lo cubren 'disconnected' + el
// stale-watchdog, y solo transicionan cuando el canal estaba realmente
// conectado). Tampoco borra la entrada ni la intencion del usuario, ni
// siquiera antes de la primera conexion — connect-tiktok-channel.js#runAttempt
// es el unico que decide reintentar, via el resultado de `conn.connect()`.

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

test('error con shape {info,exception}: el log trae el texto real, nunca undefined', () => {
  const { logger, entry } = setup();
  entry.connectedOnce = true;

  entry.conn.emit('error', errShape);

  const errLog = logger.entries.find((e) => e.event === 'canales.tiktok.error');
  assert.ok(errLog, 'se logueo canales.tiktok.error');
  assert.ok(!errLog.message.includes('undefined'), errLog.message);
  assert.equal(errLog.data.error, 'boom');
  assert.ok(errLog.data.stack && errLog.data.stack.includes('Error: boom'), 'stack real');
});

test('error NUNCA dispara recuperacion ni se muestra al usuario (lo cubren disconnected + watchdog)', () => {
  const { logger, estados, entry, state } = setup();
  entry.connectedOnce = true;
  entry.techState = 'connected';

  entry.conn.emit('error', errShape);
  entry.conn.emit('error', errShape);

  assert.equal(
    logger.entries.filter((e) => e.event === 'canales.tiktok.conexion_perdida').length, 0,
    'un error post-conexion no dispara recuperacion'
  );
  assert.equal(entry.techState, 'connected', 'el estado tecnico no cambia solo por un error');
  assert.ok(!entry.timer, 'no se armo timer de reintento');
  assert.equal(estados.length, 0, 'no se emitio ningun canal:estado');
  assert.ok(state.tiktokChannels.has('ana'), 'la entrada sigue existiendo');
  // pero el error sí se reporta en los logs, para diagnostico
  assert.ok(logger.entries.some((e) => e.event === 'canales.tiktok.error'));
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
  test(`error "${nombre}": el log nunca trae undefined`, () => {
    const { logger, entry } = setup();
    entry.connectedOnce = true;

    entry.conn.emit('error', err);

    const errLog = logger.entries.find((e) => e.event === 'canales.tiktok.error');
    assert.ok(errLog && !/undefined/.test(errLog.message), errLog && errLog.message);
    assert.equal(errLog.data.error, esperado);
  });
}

test('error pre-conexion (nunca conecto): se loguea, pero conserva la entrada y la intencion (no reintenta desde aca)', () => {
  const { state, logger, estados, entry } = setup();
  assert.equal(entry.connectedOnce, false);

  entry.conn.emit('error', errShape);

  // A diferencia del comportamiento viejo (borraba la entrada de una), el
  // supervisor nuevo nunca da de baja la intencion del usuario por un simple
  // 'error' — solo runAttempt (via el resultado real de connect()) decide.
  assert.equal(state.tiktokChannels.has('ana'), true, 'la entrada se conserva');
  assert.equal(state.tiktokChannels.get('ana'), entry, 'es la misma entrada, no se reemplazo');
  assert.equal(
    logger.entries.some((e) => e.event === 'canales.tiktok.conexion_perdida'), false,
    'un error por si solo no dispara recuperacion'
  );
  assert.equal(estados.length, 0, 'no se emitio ningun canal:estado por un simple error');
  assert.equal(entry.timer, null);
});
