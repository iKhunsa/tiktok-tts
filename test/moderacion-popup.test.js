'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { adaptMessage } = require('@tiklivetts/chat-guard');
const { createEventBus } = require('../core/event-bus');
const moderacionPolicy = require('../core/contracts/moderacion-policy');
const { emitChatMessage, resetAdminAnnounce } = require('../features/chat/emit-chat-message');
const { describeModeration } = require('../features/chat/describe-moderation');
const { createRustReviewer } = require('../features/moderacion/rust-guard/review-with-rust');

const originalReview = moderacionPolicy.review;
test.after(() => { moderacionPolicy.review = originalReview; });

const front = (...parts) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', ...parts)).href);
const TEXT_SECRETO = 'texto-secreto-del-chat';

function rawTikTok(comment = TEXT_SECRETO) {
  return { comment, uniqueId: 'nick-secreto', nickname: 'Nick Secreto', userId: 'u1', msgId: String(Math.random()) };
}

// Fija el veredicto que devuelve la politica y captura bus + logs.
function setup(verdictFor) {
  resetAdminAnnounce();
  moderacionPolicy.review = ({ platform, raw }) => verdictFor(adaptMessage({ platform, raw }));
  const logs = [];
  const logger = { log: (...args) => logs.push(args) };
  const bus = createEventBus(logger);
  bus.on('config:get', (respond) => respond({ adminIdentities: {} }), 'test');
  const ws = [];
  const blocked = [];
  bus.on('ws:broadcast', (payload) => ws.push(payload), 'test');
  bus.on('chat:mensaje-bloqueado', (payload) => blocked.push(payload), 'test');
  const send = (raw = rawTikTok()) => emitChatMessage({ bus, logger })({ platform: 'tiktok', channel: 'c', raw });
  return { send, ws, blocked, logs };
}

const moderationWs = (ws) => ws.filter((m) => m.type === 'moderation-blocked');

test('describeModeration: origen y motivo por razon del guard', () => {
  assert.deepEqual(describeModeration(['blocked-word']), { origen: 'lista-propia', motivo: 'blocked-word' });
  assert.deepEqual(describeModeration(['language']), { origen: 'diccionario', motivo: 'language' });
  assert.deepEqual(describeModeration(['banned']), { origen: 'usuario', motivo: 'banned' });
  assert.deepEqual(describeModeration(['too-long']), { origen: 'guard-js', motivo: 'too-long' });
  assert.deepEqual(describeModeration(['blocked-word', 'rust:hate']), { origen: 'lista-propia', motivo: 'blocked-word' });
  assert.deepEqual(describeModeration(['rust:hate']), { origen: 'motor-rust', motivo: 'hate' });
  assert.equal(describeModeration(['non-follower']), null);
  assert.equal(describeModeration(['policy-evaluation-failed']), null);
  assert.equal(describeModeration([]), null);
});

test('mensaje bloqueado: WS con motivo, origen y texto; bus y log sin texto ni nick', () => {
  const env = setup((message) => ({ action: 'drop', reasons: ['blocked-word'], message }));
  env.send();
  const [entry] = moderationWs(env.ws);
  assert.equal(entry.accion, 'drop');
  assert.equal(entry.origen, 'lista-propia');
  assert.equal(entry.motivo, 'blocked-word');
  assert.equal(entry.text, TEXT_SECRETO);
  assert.equal(entry.platform, 'tiktok');
  assert.equal(env.blocked.length, 1);
  assert.equal(env.blocked[0].origen, 'lista-propia');

  const log = env.logs.find((args) => args[3] === 'moderacion.filtro.mensaje_bloqueado');
  assert.ok(log, 'el evento moderacion.filtro.mensaje_bloqueado debe loguearse');
  assert.deepEqual(log[5], { platform: 'tiktok', accion: 'drop', origen: 'lista-propia', motivo: 'blocked-word' });
  const serialized = JSON.stringify(env.logs);
  assert.ok(!serialized.includes(TEXT_SECRETO) && !serialized.toLowerCase().includes('secreto'), 'los logs no llevan texto ni nick');
});

test('mensaje silenciado por contenido: se emite y se reporta; solo non-follower no cuenta', () => {
  const muted = setup((message) => ({ action: 'mute', reasons: ['muted'], message }));
  muted.send();
  assert.equal(moderationWs(muted.ws)[0].accion, 'mute');
  assert.equal(muted.ws.filter((m) => m.type === 'chat').length, 1, 'el chat igual se muestra');
  assert.ok(muted.logs.some((args) => args[3] === 'moderacion.filtro.mensaje_bloqueado'));

  const policy = setup((message) => ({ action: 'mute', reasons: ['non-follower'], message }));
  policy.send();
  assert.equal(moderationWs(policy.ws).length, 0);
  assert.ok(!policy.logs.some((args) => args[3] === 'moderacion.filtro.mensaje_bloqueado'));
});

test('motor Rust en shadow: detectado aparte y el mensaje pasa', () => {
  const env = setup((message) => ({ action: 'allow', reasons: [], message, shadow: { category: 'insulto' } }));
  env.send();
  const [entry] = moderationWs(env.ws);
  assert.equal(entry.accion, 'shadow');
  assert.equal(entry.origen, 'motor-rust');
  assert.equal(entry.motivo, 'insulto');
  assert.equal(env.ws.filter((m) => m.type === 'chat').length, 1);
  assert.equal(env.blocked.length, 0);
});

test('mensaje permitido: no genera entradas de moderacion', () => {
  const env = setup((message) => ({ action: 'allow', reasons: [], message }));
  env.send();
  assert.equal(moderationWs(env.ws).length, 0);
});

test('review-with-rust: shadow marca el veredicto sin cambiar la accion; enforce endurece', () => {
  const logger = { log: () => {} };
  const rustVerdict = { action: 'BLOCK', category: 'insulto' };
  const rustGuard = (mode) => ({ isRunning: () => true, mode: () => mode, check: () => rustVerdict });
  const verdict = { action: 'allow', reasons: [], message: { text: { display: 'hola' } } };

  const shadow = createRustReviewer({ rustGuard: rustGuard('shadow'), logger })(verdict);
  assert.equal(shadow.action, 'allow');
  assert.deepEqual(shadow.shadow, { category: 'insulto' });

  const enforce = createRustReviewer({ rustGuard: rustGuard('enforce'), logger })(verdict);
  assert.equal(enforce.action, 'drop');
  assert.equal(enforce.shadow, undefined);
  assert.deepEqual(enforce.reasons, ['rust:insulto']);
});

test('buffer de sesion: tope de 200 (sale el mas viejo) y contadores por tipo', async () => {
  const { createModerationSession, MAX_MODERATION_ENTRIES } = await front('nucleo', 'estado', 'moderacion-sesion.js');
  assert.equal(MAX_MODERATION_ENTRIES, 200);
  const session = createModerationSession();
  for (let i = 0; i < 205; i++) session.add({ accion: 'drop', text: `m${i}` });
  session.add({ accion: 'shadow', text: 'aviso' });
  const list = session.list();
  assert.equal(list.length, 200);
  assert.equal(list[0].text, 'm6');
  assert.equal(list[199].text, 'aviso');
  assert.deepEqual(session.counts(), { blocked: 205, shadow: 1 });
  session.clear();
  assert.equal(session.list().length, 0);
  assert.deepEqual(session.counts(), { blocked: 0, shadow: 0 });
});

test('buffer de sesion: avisa a los suscriptores y se puede desuscribir', async () => {
  const { createModerationSession } = await front('nucleo', 'estado', 'moderacion-sesion.js');
  const session = createModerationSession();
  let calls = 0;
  const off = session.subscribe(() => { calls++; });
  session.add({ accion: 'drop' });
  session.clear();
  off();
  session.add({ accion: 'drop' });
  assert.equal(calls, 2);
});

test('no persistencia: el buffer no toca storage, disco ni telemetria', async () => {
  const touched = [];
  const spy = { getItem: () => touched.push('get'), setItem: () => touched.push('set'), removeItem: () => touched.push('rm') };
  globalThis.localStorage = spy;
  globalThis.sessionStorage = spy;
  try {
    const { createModerationSession } = await front('nucleo', 'estado', 'moderacion-sesion.js');
    const session = createModerationSession();
    session.add({ accion: 'drop', text: 'x' });
    session.clear();
  } finally {
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
  assert.deepEqual(touched, []);

  const sources = [
    path.join(__dirname, '..', 'interfaz', 'src', 'nucleo', 'estado', 'moderacion-sesion.js'),
    ...fs.readdirSync(path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'moderacion-popup'))
      .map((file) => path.join(__dirname, '..', 'interfaz', 'src', 'vistas', 'principal', 'moderacion-popup', file)),
  ];
  for (const file of sources) {
    const code = fs.readFileSync(file, 'utf8');
    assert.ok(!/localStorage|sessionStorage|indexedDB|trackEvent|writeFile|logStorage/.test(code), `${path.basename(file)} no debe persistir ni reportar`);
  }
});

test('filtro del popup: por usuario, texto, motivo y plataforma', async () => {
  const { filterEntries } = await front('vistas', 'principal', 'moderacion-popup', 'filter-entries.js');
  const entries = [
    { nick: 'Ana', text: 'hola mundo', motivo: 'blocked-word', platform: 'tiktok' },
    { nick: 'Beto', text: 'otra cosa', motivo: 'language', platform: 'twitch' },
  ];
  assert.equal(filterEntries(entries, '').length, 2);
  assert.deepEqual(filterEntries(entries, 'ANA').map((e) => e.nick), ['Ana']);
  assert.deepEqual(filterEntries(entries, 'cosa').map((e) => e.nick), ['Beto']);
  assert.deepEqual(filterEntries(entries, 'language').map((e) => e.nick), ['Beto']);
  assert.deepEqual(filterEntries(entries, 'twitch').map((e) => e.nick), ['Beto']);
  assert.equal(filterEntries(entries, 'zzz').length, 0);
});
