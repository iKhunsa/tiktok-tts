'use strict';

// Activacion perezosa: montar /canales al arrancar no debe cargar el cliente
// de ninguna plataforma. Cada uno se requiere recien cuando el usuario conecta
// esa plataforma (quien solo usa Twitch no paga la RAM del cliente TikTok).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('require de features/canales no carga clientes de plataforma', () => {
  require('../features/canales');
  const cargados = Object.keys(require.cache);
  for (const pkg of ['@tiklivetts/tiktok-live-client', 'tmi.js', 'youtube-chat']) {
    const dir = `${path.sep}node_modules${path.sep}${pkg.replace('/', path.sep)}${path.sep}`;
    assert.ok(!cargados.some((f) => f.includes(dir)), `${pkg} se cargo al montar /canales`);
  }
});
