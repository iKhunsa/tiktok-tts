'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { esErrorConexionEsperado } = require('../electron-shell/glitchtip');

test('TikTok "isn\'t online" es esperado — no se promueve a issue', () => {
  assert.equal(esErrorConexionEsperado({
    event: 'canales.tiktok.error',
    data: { error: "Error de conexion TikTok foo: The requested user isn't online :(" },
  }), true);
});

test('YouTube "Live Stream was not found" es esperado', () => {
  assert.equal(esErrorConexionEsperado({
    event: 'canales.youtube.error',
    data: { error: 'Live Stream was not found, please try again later.' },
  }), true);
});

test('error de conexión genérico SÍ se promueve', () => {
  assert.equal(esErrorConexionEsperado({
    event: 'canales.tiktok.error',
    data: { error: 'WebSocket Error: read ECONNRESET' },
  }), false);
  assert.equal(esErrorConexionEsperado({
    event: 'canales.youtube.reconexion_fallida',
    data: { error: 'getaddrinfo ENOTFOUND www.youtube.com' },
  }), false);
});

test('eventos no-canales nunca se filtran acá', () => {
  assert.equal(esErrorConexionEsperado({
    event: 'sonido.tts.error_google_http',
    data: { error: "isn't online" },
  }), false);
});
