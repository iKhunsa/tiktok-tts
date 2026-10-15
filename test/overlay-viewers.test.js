'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const overlay = require('../features/overlay');

function registerOverlay() {
  const listeners = new Map();
  const broadcasts = [];
  const routes = new Map();
  const bus = {
    on(event, handler) {
      listeners.set(event, [...(listeners.get(event) || []), handler]);
    },
    emit(event, payload) {
      if (event === 'ws:broadcast') broadcasts.push(payload);
      for (const handler of listeners.get(event) || []) handler(payload);
    },
  };
  const app = {
    use() {},
    get(path, handler) { routes.set(path, handler); },
    post(path, handler) { routes.set(path, handler); },
  };
  overlay.register({ app, bus, logger: { log() {} } });
  return { bus, broadcasts, routes };
}

function readOverlayStats(routes) {
  let stats;
  routes.get('/api/overlay-stats')(null, { json(value) { stats = value; } });
  return stats;
}

const context = registerOverlay();

function resetOverlay() {
  context.bus.emit('canal:estado', { platform: 'tiktok', state: 'conectando' });
  context.broadcasts.length = 0;
}

test('overlay suma viewers de dos canales y difunde el total', () => {
  const { bus, broadcasts } = context;
  resetOverlay();

  bus.emit('canal:viewers', { platform: 'tiktok', channel: 'ana', viewerCount: '12' });
  bus.emit('canal:viewers', { platform: 'tiktok', channel: 'leo', viewerCount: 8 });

  assert.deepEqual(broadcasts.at(-1), { type: 'viewers', total: 20 });
});

test('overlay quita los viewers de un canal desconectado', () => {
  const { bus, broadcasts } = context;
  resetOverlay();

  bus.emit('canal:viewers', { platform: 'tiktok', channel: 'ana', viewerCount: 12 });
  bus.emit('canal:viewers', { platform: 'tiktok', channel: 'leo', viewerCount: 8 });
  bus.emit('canal:estado', { platform: 'tiktok', channel: 'ana', state: 'desconectado' });

  assert.deepEqual(broadcasts.at(-1), { type: 'viewers', total: 8 });
  bus.emit('canal:estado', { platform: 'tiktok', state: 'conectando' });
  assert.deepEqual(broadcasts.at(-1), { type: 'viewers', total: 0 });
});

test('/api/overlay-stats incluye el total de viewers', () => {
  const { bus, routes } = context;
  resetOverlay();

  bus.emit('canal:viewers', { platform: 'tiktok', channel: 'ana', viewerCount: 12 });

  assert.equal(readOverlayStats(routes).viewerCount, 12);
});

test('POST /api/test/viewers emite un conteo de prueba y lo manda al overlay', () => {
  resetOverlay();
  let respuesta;
  context.routes.get('/api/test/viewers')(null, { json(value) { respuesta = value; } });

  assert.equal(respuesta.success, true);
  assert.equal(context.broadcasts.at(-1).type, 'viewers');
  assert.equal(context.broadcasts.at(-1).total, respuesta.count);
  resetOverlay();
});
