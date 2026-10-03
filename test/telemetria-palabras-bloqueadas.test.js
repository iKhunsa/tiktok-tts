'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { sanitizeWord, sanitizeWords, listHash } = require('../features/telemetria/blocked-words/sanitize');
const { createSync, WEEK_MS, DEBOUNCE_MS } = require('../features/telemetria/connectors/blocked-words');

const DAY = 24 * 60 * 60 * 1000;

function harness({ enabled = true, runtime = true, words = ['tonto', 'Grosería'] } = {}) {
  const state = { config: { blockedWordsTelemetryEnabled: enabled, ttsVoiceLang: 'es-MX' }, words, clock: 1_000_000, timers: [], sent: [] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-'));
  state.file = path.join(dir, 'a.json');
  const bus = {
    emit(event, cb) {
      if (event === 'config:get') cb(state.config);
      if (event === 'moderacion:palabras-get') cb(state.words);
    },
  };
  state.sync = createSync({
    bus,
    track: (c, n, p) => state.sent.push({ c, n, p }),
    isEnabled: () => runtime,
    stateFile: () => state.file,
    now: () => state.clock,
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false, unref() {} }; state.timers.push(t); return t; },
    clearTimer: (t) => { t.cleared = true; },
  });
  state.fire = () => state.timers.filter((t) => !t.cleared).forEach((t) => { t.cleared = true; t.fn(); });
  return state;
}

test('saneado: descarta @, URLs, emails, 6+ digitos, >3 palabras, >40 chars', () => {
  for (const bad of ['@pepe', 'http://x.com', 'www.x.com', 'a@b.co', 'llama 123456789', 'uno dos tres cuatro', 'x'.repeat(41), '', '  ', 42]) {
    assert.equal(sanitizeWord(bad), null, String(bad));
  }
  assert.equal(sanitizeWord('  Grosería   Fuerte '), 'groseria fuerte');
  assert.equal(sanitizeWord('Año'), 'año'); // la ñ se conserva
  assert.equal(sanitizeWord('12345'), '12345'); // 5 digitos pasan
});

test('saneado de lista: unica, ordenada y max 500', () => {
  assert.deepEqual(sanitizeWords(['b', 'A', 'a', '@x']), ['a', 'b']);
  const many = Array.from({ length: 800 }, (_, i) => `w${String(i).padStart(4, 'a')}`);
  assert.equal(sanitizeWords(many).length, 500);
  assert.deepEqual(sanitizeWords(null), []);
});

test('hash estable e independiente del orden de entrada', () => {
  const a = listHash(sanitizeWords(['uno', 'dos']));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, listHash(sanitizeWords(['DOS', 'uno'])));
  assert.notEqual(a, listHash(sanitizeWords(['uno'])));
});

test('apagado => cero envios y cero estado', () => {
  const h = harness({ enabled: false });
  h.sync.check(); h.sync.onListChanged(); h.sync.send();
  assert.equal(h.sent.length, 0);
  assert.equal(h.timers.length, 0);
  assert.equal(fs.existsSync(h.file), false);
});

test('sin runtime de telemetria (sin URL) => no-op y no marca como enviado', () => {
  const h = harness({ runtime: false });
  h.sync.check(); h.sync.send();
  assert.equal(h.sent.length, 0);
  assert.equal(fs.existsSync(h.file), false);
});

test('primer check envia el snapshot con solo las props permitidas', () => {
  const h = harness();
  h.sync.check();
  assert.equal(h.sent.length, 1);
  const { c, n, p } = h.sent[0];
  assert.deepEqual([c, n], ['moderation', 'blocked_words_snapshot']);
  assert.deepEqual(Object.keys(p).sort(), ['lang', 'list_hash', 'snapshot_at', 'words']);
  assert.deepEqual(p.words, ['grosería'.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 'tonto'].sort());
  assert.equal(p.list_hash, listHash(p.words));
});

test('mismo hash y <7 dias => no envia; a los 7 dias reenvia', () => {
  const h = harness();
  h.sync.check();
  h.clock += 6 * DAY; h.sync.check(); h.sync.send();
  assert.equal(h.sent.length, 1);
  h.clock += DAY; h.sync.check();
  assert.equal(h.sent.length, 2);
});

test('cambio de lista: debounce de 10 min, reinicia con cada edicion y envia una vez', () => {
  const h = harness();
  h.sync.check();
  h.words = ['tonto', 'nueva'];
  h.sync.onListChanged();
  h.sync.onListChanged();
  const live = h.timers.filter((t) => !t.cleared);
  assert.equal(live.length, 1);
  assert.equal(live[0].ms, DEBOUNCE_MS);
  assert.equal(h.sent.length, 1);
  h.fire();
  assert.equal(h.sent.length, 2);
  assert.ok(h.sent[1].p.words.includes('nueva'));
});

test('editar y volver a la misma lista no reenvia', () => {
  const h = harness();
  h.sync.check();
  h.sync.onListChanged();
  h.fire();
  assert.equal(h.sent.length, 1);
});

test('apagar el interruptor durante el debounce cancela el envio', () => {
  const h = harness();
  h.sync.check();
  h.words = ['otra'];
  h.sync.onListChanged();
  h.config.blockedWordsTelemetryEnabled = false;
  h.sync.check(); // config:actualizado con la clave
  h.fire();
  assert.equal(h.sent.length, 1);
});

test('lista editada con la app cerrada se envia tras el debounce', () => {
  const h = harness();
  h.sync.check();
  h.words = ['tonto', 'nueva'];
  h.clock += DAY;
  h.sync.check();
  assert.equal(h.sent.length, 1);
  h.fire();
  assert.equal(h.sent.length, 2);
});

test('estado por cuenta: otra cuenta tiene su propio ultimo envio', () => {
  const h = harness();
  h.sync.check();
  const first = h.file;
  h.file = path.join(path.dirname(first), 'b.json');
  h.sync.check(); // cuenta B nunca envio
  assert.equal(h.sent.length, 2);
  h.file = first;
  h.sync.check(); // cuenta A ya envio y no esta vencida
  assert.equal(h.sent.length, 2);
});

test('lista vacia o toda descartada no envia', () => {
  const h = harness({ words: ['@x', 'http://a.b'] });
  h.sync.check();
  assert.equal(h.sent.length, 0);
});

test('estado corrupto se trata como sin envio previo (no lanza)', () => {
  const h = harness();
  fs.writeFileSync(h.file, '{roto');
  h.sync.check();
  assert.equal(h.sent.length, 1);
  assert.ok(WEEK_MS === 7 * DAY);
});
