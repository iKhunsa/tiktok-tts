'use strict';

// BE-027: credencial por instalacion. Fija que el secreto persiste/regenera,
// la URL de registro y que cada batch lleva firma HMAC + el token compartido.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadOrCreateSecret, registerSecret, registerUrl } = require('../features/telemetria/credential');
const { Transport } = require('../features/telemetria/transport');

const logger = { log() {} };

test('crea el secreto, lo reusa y lo regenera si el archivo esta corrupto', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cred-'));
  const a = loadOrCreateSecret(dir);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(loadOrCreateSecret(dir), a);
  fs.writeFileSync(path.join(dir, 'ingest-credential.json'), '{roto');
  const b = loadOrCreateSecret(dir);
  assert.match(b, /^[0-9a-f]{64}$/);
  assert.notEqual(b, a);
});

test('la URL de registro reemplaza solo el ultimo segmento', () => {
  assert.equal(registerUrl('https://t.example.com/api/ingest'), 'https://t.example.com/api/ingest/register');
});

test('registerSecret nunca lanza aunque falle la red', async () => {
  const warns = [];
  await registerSecret({ url: 'http://127.0.0.1:1/api/ingest', token: 't', machineId: 'm', secret: 's',
    logger: { log: (lvl) => warns.push(lvl) } });
  assert.deepEqual(warns, ['warn']);
});

test('cada batch lleva token compartido + firma HMAC verificable', () => {
  const identity = { machineId: 'm1', sessionId: 's1', ingestSecret: 'abc' };
  const h = new Transport({ url: 'http://x/api/ingest', token: 'tok', identity, logger }).headers();
  assert.equal(h['X-Ingest-Token'], 'tok');
  const expected = crypto.createHmac('sha256', 'abc')
    .update(`m1.s1.${h['X-Ingest-Ts']}.${h['X-Ingest-Nonce']}`).digest('hex');
  assert.equal(h['X-Ingest-Signature'], expected);

  const sinSecreto = new Transport({ url: 'u', token: 'tok', identity: { machineId: 'm1' }, logger }).headers();
  assert.equal(sinSecreto['X-Ingest-Signature'], undefined);
});
