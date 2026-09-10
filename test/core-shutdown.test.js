'use strict';

// leaks-1: shutdownAll tiene que ejecutar de verdad los shutdown() registrados
// via trackForShutdown (antes se colgaba de process.on('exit'), sincrono, y
// ningun shutdown async llegaba a correr).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { trackForShutdown, shutdownAll } = require('../core/shutdown');

test('shutdownAll corre los shutdown() registrados', async () => {
  const corridos = [];
  trackForShutdown('dominio-sync', () => { corridos.push('sync'); });
  trackForShutdown('dominio-async', async () => { corridos.push('async'); });

  await shutdownAll({ log: () => {} });

  assert.ok(corridos.includes('sync'), 'corrio el shutdown sincrono');
  assert.ok(corridos.includes('async'), 'corrio el shutdown async');
});
