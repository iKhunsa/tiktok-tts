'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { adaptMessage, createChatGuard, createViewerRegistry } = require('@tiklivetts/chat-guard');
const { createEventBus } = require('../core/event-bus');
const moderacionPolicy = require('../core/contracts/moderacion-policy');
const { emitChatMessage, resetAdminAnnounce } = require('../features/chat/emit-chat-message');
const chatDomain = require('../features/chat/index');

const originalReview = moderacionPolicy.review;

moderacionPolicy.review = ({ platform, raw }) => ({
  action: 'allow',
  reasons: [],
  message: adaptMessage({ platform, raw }),
});

test.after(() => {
  moderacionPolicy.review = originalReview;
});

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

  // comment distinto por llamada: el gate de dedup de emit-chat-message
  // descartaria un mensaje byte-identico repetido y este test necesita que
  // cada emision llegue al orquestador.
  let n = 0;
  const adminMessage = () => emitChatMessage({ bus, logger })({
    platform: 'tiktok', channel: 'x', raw: { nickname: 'Streamer', uniqueId: 'streamer', comment: `hola ${n++}` },
  });

  const adminAnnounceCount = () => broadcasts.filter((b) => b.type === 'admin-announce').length;

  return { broadcasts, bus, adminMessage, adminAnnounceCount };
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

test('redelivery del admin queda bloqueado por el guard', () => {
  const guard = createChatGuard({ registry: createViewerRegistry() });
  const previousReview = moderacionPolicy.review;
  moderacionPolicy.review = (input) => guard.review(input);

  try {
    const { broadcasts, bus } = setup();
    const blocked = [];
    const raw = { nickname: 'Streamer', uniqueId: 'streamer', comment: 'hola', msgId: 'same' };
    bus.on('chat:mensaje-bloqueado', (payload) => blocked.push(payload), 'test');
    const emit = emitChatMessage({ bus, logger: { log() {} } });

    emit({ platform: 'tiktok', channel: 'x', raw });
    emit({ platform: 'tiktok', channel: 'x', raw });

    assert.equal(broadcasts.filter((payload) => payload.type === 'chat').length, 1);
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].motivo, 'duplicate-redelivery');
  } finally {
    moderacionPolicy.review = previousReview;
  }
});

test('un fallo de politica muestra el mensaje sin enviarlo a TTS', () => {
  const previousReview = moderacionPolicy.review;
  moderacionPolicy.review = () => { throw new Error('policy unavailable'); };

  try {
    const { broadcasts, bus } = setup();
    emitChatMessage({ bus, logger: { log() {} } })({
      platform: 'tiktok',
      channel: 'x',
      raw: { nickname: 'Viewer', uniqueId: 'viewer', comment: 'hola' },
    });

    const message = broadcasts.find((payload) => payload.type === 'chat');
    assert.equal(message.muted, true);
    assert.equal(message.ttsBlocked, true);
  } finally {
    moderacionPolicy.review = previousReview;
  }
});

test('un mensaje que no se puede adaptar se registra y descarta', () => {
  const previousReview = moderacionPolicy.review;
  const logs = [];
  moderacionPolicy.review = () => { throw new Error('policy unavailable'); };

  try {
    const { broadcasts, bus } = setup();
    emitChatMessage({ bus, logger: { log: (...entry) => logs.push(entry) } })({
      platform: 'unknown',
      channel: 'x',
      raw: { comment: 'hola' },
    });

    assert.equal(broadcasts.some((payload) => payload.type === 'chat'), false);
    assert.equal(logs.some((entry) => entry[3] === 'chat.policy_fallo_adaptacion'), true);
  } finally {
    moderacionPolicy.review = previousReview;
  }
});
