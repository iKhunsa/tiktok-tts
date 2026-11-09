'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { conLogOAuth } = require('../electron-shell/log-oauth');

function loggerFalso() {
  const entradas = [];
  return { entradas, log: (level, domain, fn, event, message, data) => entradas.push({ level, event, message, data }) };
}

test('login ok: loguea iniciado + completado y devuelve el resultado intacto', async () => {
  const logger = loggerFalso();
  const r = await conLogOAuth(logger, 'twitch', async () => ({ code: 'SECRETO', codeVerifier: 'SECRETO2' }));
  assert.deepEqual(r, { code: 'SECRETO', codeVerifier: 'SECRETO2' });
  assert.deepEqual(logger.entradas.map((e) => [e.level, e.event]), [
    ['info', 'electron_shell.oauth.iniciado'],
    ['info', 'electron_shell.oauth.completado'],
  ]);
});

test('nunca loguea code ni codeVerifier', async () => {
  const logger = loggerFalso();
  await conLogOAuth(logger, 'kick', async () => ({ code: 'SECRETO', codeVerifier: 'SECRETO2' }));
  assert.ok(!JSON.stringify(logger.entradas).includes('SECRETO'));
});

test('access_denied: info "cancelado" y re-lanza el mismo error', async () => {
  const logger = loggerFalso();
  const err = new Error('access_denied');
  await assert.rejects(conLogOAuth(logger, 'google', async () => { throw err; }), (e) => e === err);
  assert.deepEqual(logger.entradas.at(-1).event, 'electron_shell.oauth.cancelado');
  assert.equal(logger.entradas.at(-1).level, 'info');
});

test('timeout: warn (no es un bug) y re-lanza', async () => {
  const logger = loggerFalso();
  await assert.rejects(conLogOAuth(logger, 'kick', async () => { throw new Error('timeout'); }), /timeout/);
  assert.equal(logger.entradas.at(-1).event, 'electron_shell.oauth.timeout');
  assert.equal(logger.entradas.at(-1).level, 'warn');
});

test('otro fallo (puerto ocupado): error "fallido" con el Error original, va a GlitchTip', async () => {
  const logger = loggerFalso();
  const err = new Error('listen EADDRINUSE: address already in use');
  await assert.rejects(conLogOAuth(logger, 'twitch', async () => { throw err; }), (e) => e === err);
  const ultima = logger.entradas.at(-1);
  assert.equal(ultima.level, 'error');
  assert.equal(ultima.event, 'electron_shell.oauth.fallido');
  assert.equal(ultima.data.error, err);
  assert.equal(ultima.data.plataforma, 'twitch');
});
