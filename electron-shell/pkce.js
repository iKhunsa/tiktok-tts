'use strict';

// PKCE (RFC 7636) compartido por los bailes OAuth que lo necesitan — hoy
// Google y Kick (ver docs/plan-google-auth.md y docs/plan-twitch-kick.md).

const crypto = require('crypto');

function generarPKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

module.exports = { generarPKCE };
