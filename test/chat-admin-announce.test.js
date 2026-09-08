'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEventBus } = require('../core/event-bus');
const { emitChatMessage, resetAdminAnnounce } = require('../features/chat/emit-chat-message');
const chatDomain = require('../features/chat/index');

function setup() {
  resetAdminAnnounce();
  const logger = { log: () => {} };
  const bus = createEventBus(logger);
  bus.on('config:get', (respond) => respond({ adminIdentities: { tiktok: ['streamer'] } }), 'test');

  const broadcasts = [];
  bus.on('ws:broadcast', (payload) => broadcasts.push(payload), 'test');

  // Simula app.post real solo lo suficiente para register() de chat/index.js.
  const app = { get: () => {}, post: () => {} };
  chatDomain.register({ app, bus, logger });

  const adminMessage = () => emitChatMessage({ bus, logger })({
    platform: 'tiktok', channel: 'x', raw: { nickname: 'Streamer', uniqueId: 'streamer', comment: 'hola' },
  });

  const adminAnnounceCount = () => broadcasts.filter((b) => b.type === 'admin-announce').length;

  return { bus, adminMessage, adminAnnounceCount };
}

test('mensaje del admin dispara admin-announce una sola vez', () => {
  const { adminMessage, adminAnnounceCount } = setup();
  adminMessage();
  assert.equal(adminAnnounceCount(), 1);
});

test('canal:estado "desconectado" de una plataforma no resetea el aviso (BUG A)', () => {
  const { bus, adminMessage, adminAnnounceCount } = setup();
  adminMessage();
  assert.equal(adminAnnounceCount(), 1);

  bus.emit('canal:estado', { platform: 'twitch', channel: 'y', state: 'desconectado' });
  adminMessage();
  assert.equal(adminAnnounceCount(), 1, 'no debe re-anunciar tras un desconectado por-canal transitorio');
});

test('lista-canales total 0 seguido de reconexion re-anuncia (sesion nueva)', () => {
  const { bus, adminMessage, adminAnnounceCount } = setup();
  adminMessage();
  assert.equal(adminAnnounceCount(), 1);

  bus.emit('canal:estado', { state: 'lista-canales', tiktok: [], twitch: [], youtube: [], kick: [] });
  bus.emit('canal:estado', { state: 'lista-canales', tiktok: ['streamer'], twitch: [], youtube: [], kick: [] });
  adminMessage();
  assert.equal(adminAnnounceCount(), 2, 'sesion nueva debe volver a anunciar');
});
