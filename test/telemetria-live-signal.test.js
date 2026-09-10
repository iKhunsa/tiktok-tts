'use strict';

// La senal "en vivo" (app/live cada 60s mientras haya un canal conectado) es
// lo que el panel usa para el mapa. Esta prueba fija su logica de gating:
// arranca al primer canal, no duplica, para solo cuando cae el ultimo.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { attach } = require('../features/telemetria/connectors/platforms');

function setup() {
  const bus = new EventEmitter();
  const events = [];
  const track = (connector, name) => events.push(`${connector}/${name}`);
  attach(bus, track, { markPlatform() {} });
  const emit = (state, channel, platform = 'tiktok') =>
    bus.emit('canal:estado', { platform, channel, state });
  return { emit, events };
}

test('primer canal conectado -> live inmediato; el segundo no re-dispara', () => {
  const { emit, events } = setup();
  emit('conectado', 'ana');
  emit('conectado', 'beto');
  assert.deepEqual(events.filter((e) => e === 'app/live'), ['app/live']);
});

test('live_stopped solo cuando cae el ultimo canal', () => {
  const { emit, events } = setup();
  emit('conectado', 'ana');
  emit('conectado', 'beto');
  emit('desconectado', 'ana');
  assert.ok(!events.includes('app/live_stopped'), 'aun queda beto conectado');
  emit('desconectado', 'beto');
  assert.ok(events.includes('app/live_stopped'), 'ya no queda ninguno');
});

test('sin-canales corta la senal aunque no traiga channel', () => {
  const { emit, events } = setup();
  emit('conectado', 'ana');
  emit('sin-canales', undefined);
  assert.ok(events.includes('app/live_stopped'));
});

test('reconectando / error no cortan la senal', () => {
  const { emit, events } = setup();
  emit('conectado', 'ana');
  emit('reconectando', 'ana');
  emit('error', 'ana');
  assert.ok(!events.includes('app/live_stopped'));
});

test('un ciclo completo no deja timers colgados (el proceso puede salir)', () => {
  const { emit } = setup();
  emit('conectado', 'ana');
  emit('desconectado', 'ana');
  // Si stopLive() no hiciera clearInterval, node:test avisaria de un handle
  // abierto al terminar la suite.
});
