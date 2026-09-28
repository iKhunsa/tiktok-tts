'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { atomicWriteFileSync } = require('../../core/atomic-write');

// Credencial propia por instalacion (BE-027): un secreto local con el que se
// firma cada batch (HMAC). El secreto lo genera el cliente y se registra en el
// servidor con el token compartido; el servidor responde 409 si ya lo tenia.

const FILE_NAME = 'ingest-credential.json';

function loadOrCreateSecret(dataDir) {
  const file = path.join(dataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed.secret === 'string' && /^[0-9a-f]{64}$/.test(parsed.secret)) return parsed.secret;
  } catch (_) { /* inexistente o corrupto: se regenera */ }

  const secret = crypto.randomBytes(32).toString('hex');
  try {
    atomicWriteFileSync(file, JSON.stringify({ secret }));
  } catch (_) { /* sin disco: vale para esta sesion, se reintenta al proximo arranque */ }
  return secret;
}

// Misma URL de ingesta, con /register colgando debajo: .../api/ingest -> .../api/ingest/register
// (el backend expone POST /api/ingest/register, no /api/register).
function registerUrl(url) {
  return url.replace(/\/+$/, '') + '/register';
}

async function registerSecret({ url, token, machineId, secret, logger }) {
  try {
    const res = await fetch(registerUrl(url), {
      method: 'POST',
      headers: token
        ? { 'Content-Type': 'application/json', 'X-Ingest-Token': token }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, secret }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    logger.log(
      'warn', 'telemetria', 'telemetria/credential.js#registerSecret', 'telemetria.credencial.registro_fallido',
      `No se pudo registrar la credencial de ingesta: ${error.message}`, { error: error.message }
    );
  }
}

module.exports = { loadOrCreateSecret, registerSecret, registerUrl };
