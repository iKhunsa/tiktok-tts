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
  return { bus, emit, events };
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

test('telemetry:shutdown corta el live (sin esperar la ventana de 150s)', () => {
  const bus = new EventEmitter();
  const events = [];
  attach(bus, (c, n) => events.push(`${c}/${n}`), { markPlatform() {} });
  bus.emit('telemetry:shutdown');
  assert.ok(!events.includes('app/live_stopped'), 'sin live no hay nada que cortar');
  bus.emit('canal:estado', { platform: 'tiktok', channel: 'ana', state: 'conectado' });
  bus.emit('telemetry:shutdown');
  assert.deepEqual(events.filter((e) => e === 'app/live_stopped'), ['app/live_stopped']);
});

// ── Fin del directo (canal:live, emitido por canales/live-status) ───────────
// El chat de Twitch/Kick/YouTube sigue "conectado" cuando el stream termina:
// el veredicto offline tiene que cortar la senal aunque no haya 'desconectado'.

const live = (bus, platform, channel, value) => bus.emit('canal:live', { platform, channel, live: value });

test('veredicto offline del unico canal corta app/live aunque el chat siga conectado', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  live(bus, 'twitch', 'ana', false);
  assert.ok(events.includes('app/live_stopped'));
});

test('con dos canales, el offline de uno NO corta la senal mientras el otro siga en vivo', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  emit('conectado', 'bob', 'kick');
  live(bus, 'twitch', 'ana', false);
  assert.ok(!events.includes('app/live_stopped'));
  live(bus, 'kick', 'bob', false);
  assert.ok(events.includes('app/live_stopped'));
});

test('reconexion del chat de un canal ya confirmado offline NO vuelve a contarlo', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  live(bus, 'twitch', 'ana', false);
  const antes = events.filter((e) => e === 'app/live').length;
  emit('conectado', 'ana', 'twitch'); // el chat se reconecta sin pasar por 'desconectado'
  assert.equal(events.filter((e) => e === 'app/live').length, antes, 'no arranca otra senal');
});

test('el streamer empieza el directo despues: live=true vuelve a contar', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  live(bus, 'twitch', 'ana', false);
  live(bus, 'twitch', 'ana', true);
  assert.equal(events.filter((e) => e === 'app/live').length, 2, 'app/live arranco de nuevo');
});

test('desconectar y volver a conectar limpia el veredicto: cuenta como antes', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  live(bus, 'twitch', 'ana', false);
  emit('desconectado', 'ana', 'twitch');
  emit('conectado', 'ana', 'twitch');
  assert.equal(events.filter((e) => e === 'app/live').length, 2);
});

test('canal:live con datos invalidos se ignora sin romper', () => {
  const { bus, emit, events } = setup();
  emit('conectado', 'ana', 'twitch');
  bus.emit('canal:live', null);
  bus.emit('canal:live', { platform: 'obs', channel: null, live: false });
  bus.emit('canal:live', { platform: 'twitch', channel: 'ana', live: 'no' });
  assert.ok(!events.includes('app/live_stopped'));
});
