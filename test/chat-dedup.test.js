'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEventBus } = require('../core/event-bus');
const { emitChatMessage, resetDedup } = require('../features/chat/emit-chat-message');

function setup() {
  resetDedup();
  const logger = { log: () => {} };
  const bus = createEventBus(logger);
  bus.on('config:get', (respond) => respond({ ttsReadNonFollowers: true }), 'test');

  const permitidos = [];
  bus.on('chat:mensaje-permitido', (p) => permitidos.push(p), 'test');

  const emit = emitChatMessage({ bus, logger });
  const tiktok = (uniqueId, comment) => emit({
    platform: 'tiktok', channel: 'x', raw: { nickname: uniqueId, uniqueId, comment },
  });

  return { emit, tiktok, permitidos };
}

test('replay del mismo canal:mensaje-crudo produce chat:mensaje-permitido una sola vez', () => {
  const { tiktok, permitidos } = setup();
  tiktok('bob', 'hola a todos');
  tiktok('bob', 'hola a todos'); // replay tras reconexion
  assert.equal(permitidos.length, 1);
});

test('mensaje repetido por el mismo usuario fuera de la ventana NO se descarta', () => {
  const { emit, permitidos } = setup();
  const raw = { nickname: 'ana', uniqueId: 'ana', comment: 'buenas' };
  emit({ platform: 'tiktok', channel: 'x', raw });

  // Avanza el reloj mas alla de la ventana de dedup (10 min).
  const realNow = Date.now;
  Date.now = () => realNow() + 21 * 60 * 1000;
  try {
    emit({ platform: 'tiktok', channel: 'x', raw });
  } finally {
    Date.now = realNow;
  }
  assert.equal(permitidos.length, 2);
});

test('otras plataformas comparten el gate y usan id nativo cuando existe', () => {
  const { emit, permitidos } = setup();
  const yt = { author: { name: 'C', channelId: 'c1' }, message: [{ text: 'hi' }], id: 'yt-123' };
  emit({ platform: 'youtube', channel: 'x', raw: yt });
  emit({ platform: 'youtube', channel: 'x', raw: yt }); // mismo item.id
  assert.equal(permitidos.length, 1);
});
