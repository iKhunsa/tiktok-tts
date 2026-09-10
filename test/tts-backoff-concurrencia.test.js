'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const https = require('node:https');
const fs = require('node:fs');

const { fetchTtsAudio, _resetBackoff, _backoff } = require('../features/sonido/tts/fetch-audio');

// Mock de https.get: 200 lento con audio, o 404 instantaneo segun la URL.
function installHttpsMock() {
  const orig = https.get;
  https.get = (url, _opts, cb) => {
    const req = new EventEmitter();
    req.setTimeout = () => {};
    req.destroy = () => {};
    const slow = /SLOW/.test(url);
    const res = new EventEmitter();
    res.resume = () => {};
    if (slow) {
      res.statusCode = 200;
      res.headers = { 'content-type': 'audio/mpeg' };
    } else {
      res.statusCode = 404;
      res.headers = {};
    }
    setTimeout(() => {
      cb(res); // listeners se enganchan acá
      if (slow) setTimeout(() => { res.emit('data', Buffer.alloc(4096)); res.emit('end'); }, 120);
      else setTimeout(() => res.emit('end'), 0);
    }, 0);
    return req;
  };
  return () => { https.get = orig; };
}

test('un exito lento no borra una pausa de backoff que setearon fallos concurrentes', async () => {
  _resetBackoff();
  const restoreHttps = installHttpsMock();
  const origWrite = fs.writeFileSync;
  fs.writeFileSync = () => {};
  const u = Date.now();

  try {
    // A: request lento que termina con exito. Arranca primero.
    const slow = fetchTtsAudio({ text: `SLOW ${u}`, voice: 'es' });
    // B,C,D: fallos 404 instantaneos (no reintentables) → empujan fallosSeguidos
    // a 3 y setean backoff.pausadoHasta MIENTRAS A sigue en vuelo.
    const fails = [1, 2, 3].map((n) =>
      fetchTtsAudio({ text: `x${n} ${u}`, voice: 'es' }).then(() => null, (e) => e));

    await Promise.all(fails);
    assert.ok(_backoff.pausadoHasta > Date.now(), 'la rafaga concurrente dejó una pausa activa');

    await slow; // resuelve con exito
    assert.ok(
      _backoff.pausadoHasta > Date.now(),
      'el exito lento (arrancó antes de la pausa) NO debe levantar el backoff',
    );
  } finally {
    fs.writeFileSync = origWrite;
    restoreHttps();
    _resetBackoff();
  }
});
