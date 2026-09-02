'use strict';

const crypto = require('crypto');
const os = require('os');

// machine_id: estable por maquina, no reversible. Es un hash del usuario del
// sistema mas el nombre del equipo; no viaja ninguno de los dos en claro.
function machineId() {
  let raw;
  try {
    raw = `${os.userInfo().username}@${os.hostname()}`;
  } catch (_) {
    raw = os.hostname();
  }
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sessionId() {
  return crypto.randomUUID();
}

function osInfo() {
  return {
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    locale: Intl.DateTimeFormat().resolvedOptions().locale || null,
  };
}

module.exports = { machineId, sessionId, osInfo };
