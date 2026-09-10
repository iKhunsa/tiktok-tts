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
  // msgId = id de mensaje del server de TikTok (unico por mensaje), lo aplana
  // tiktok-live-connector desde common.msgId. createTime es del mismo bloque
  // pero NO es unico — se repite entre mensajes del mismo frame.
  let seq = 0;
  const tiktok = (uniqueId, comment, opts = {}) => {
    seq += 1;
    const raw = {
      nickname: uniqueId, uniqueId, comment,
      msgId: opts.msgId !== undefined ? opts.msgId : `m${seq}`,
      createTime: opts.createTime || '1700000000',
    };
    if (opts.msgId === null) delete raw.msgId;
    return emit({ platform: 'tiktok', channel: 'x', raw });
  };

  return { emit, tiktok, permitidos };
}

test('replay del mismo mensaje (mismo msgId) produce chat:mensaje-permitido una sola vez', () => {
  const { tiktok, permitidos } = setup();
  tiktok('bob', 'hola a todos', { msgId: 'x1' });
  tiktok('bob', 'hola a todos', { msgId: 'x1' }); // replay tras reconexion
  assert.equal(permitidos.length, 1);
});

test('replay de TikTok 8 min despues (mismo msgId) sigue deduplicado', () => {
  const { tiktok, permitidos } = setup();
  tiktok('ana', 'buenas', { msgId: 'x1' });

  const realNow = Date.now;
  Date.now = () => realNow() + 8 * 60 * 1000;
  try {
    tiktok('ana', 'buenas', { msgId: 'x1' }); // replay: mismo msgId
  } finally {
    Date.now = realNow;
  }
  assert.equal(permitidos.length, 1);
});

test('REGRESION: dos mensajes distintos del mismo user con el mismo createTime y texto NO se colapsan', () => {
  // createTime es un int64 que se repite entre mensajes del mismo frame. Si se
  // usara como discriminador, "gg" mandado dos veces (o "!p", o un emote) se
  // tragaria el segundo. El discriminador real es msgId (unico por mensaje).
  const { tiktok, permitidos } = setup();
  tiktok('leo', 'gg', { msgId: 'a', createTime: '1700000000' });
  tiktok('leo', 'gg', { msgId: 'b', createTime: '1700000000' }); // otro mensaje, mismo createTime
  assert.equal(permitidos.length, 2);
});

test('fallback (sin msgId): replay con mismo createTime+texto se deduplica', () => {
  const { tiktok, permitidos } = setup();
  tiktok('ana', 'buenas', { msgId: null, createTime: '1700000000' });
  tiktok('ana', 'buenas', { msgId: null, createTime: '1700000000' }); // replay
  assert.equal(permitidos.length, 1);
});

test('repeticion legitima (mismo texto, msgId distinto, 30s aparte) NO se descarta', () => {
  const { tiktok, permitidos } = setup();
  tiktok('ana', 'hola', { msgId: 'a' });

  const realNow = Date.now;
  Date.now = () => realNow() + 30 * 1000;
  try {
    tiktok('ana', 'hola', { msgId: 'b' }); // el user reenvia: msgId nuevo
  } finally {
    Date.now = realNow;
  }
  assert.equal(permitidos.length, 2);
});

test('mensaje repetido por el mismo usuario fuera de la ventana NO se descarta', () => {
  const { tiktok, permitidos } = setup();
  tiktok('ana', 'buenas', { msgId: 'x1' });

  // Avanza el reloj mas alla de la ventana de dedup (10 min).
  const realNow = Date.now;
  Date.now = () => realNow() + 21 * 60 * 1000;
  try {
    tiktok('ana', 'buenas', { msgId: 'x1' });
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

test('Twitch: replay con el mismo tag id (UUID) se descarta', () => {
  const { emit, permitidos } = setup();
  const raw = { tags: { 'display-name': 'Ana', 'user-id': 'u1', id: 'uuid-1', 'tmi-sent-ts': '1700000000000' }, message: 'hola' };
  emit({ platform: 'twitch', channel: 'x', raw });
  emit({ platform: 'twitch', channel: 'x', raw }); // replay: mismo tag id
  assert.equal(permitidos.length, 1);
});

test('Twitch: repeticion legitima (mismo texto, tag id nuevo) NO se descarta', () => {
  const { emit, permitidos } = setup();
  const mk = (id) => ({ tags: { 'display-name': 'Ana', 'user-id': 'u1', id, 'tmi-sent-ts': '1700000000000' }, message: '!p una cancion' });
  emit({ platform: 'twitch', channel: 'x', raw: mk('uuid-1') });
  emit({ platform: 'twitch', channel: 'x', raw: mk('uuid-2') }); // otro mensaje
  assert.equal(permitidos.length, 2);
});

test('Twitch fallback (sin tag id): dedup por tmi-sent-ts + texto', () => {
  const { emit, permitidos } = setup();
  const mk = (ts) => ({ tags: { 'display-name': 'Ana', 'user-id': 'u1', 'tmi-sent-ts': ts }, message: 'hola' });
  emit({ platform: 'twitch', channel: 'x', raw: mk('1700000000000') });
  emit({ platform: 'twitch', channel: 'x', raw: mk('1700000000000') }); // replay: mismo ts
  assert.equal(permitidos.length, 1);
  emit({ platform: 'twitch', channel: 'x', raw: mk('1700000200000') }); // 200s despues -> nuevo
  assert.equal(permitidos.length, 2);
});
