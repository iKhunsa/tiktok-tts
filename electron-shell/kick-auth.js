'use strict';

// Baile OAuth de Kick (ver docs/plan-twitch-kick.md). Igual que Twitch,
// puerto fijo (registrado de antemano en el panel de Kick) — pero Kick
// exige PKCE ademas del client_secret (que vive en el backend, nunca aca).

const path = require('path');
const crypto = require('crypto');
const { generarPKCE } = require('./pkce');
const { autenticarConLoopback } = require('./oauth-loopback');
const { resolveConfigValue } = require('./resolve-config-value');

const PUERTO = 17624;
const SCOPE = 'user:read chat:write events:subscribe';

// Publico, bakeado igual que oauth-config.json#googleClientId (ver
// google-auth.js). Mismo client_id que KICK_CLIENT_ID en servicio-cuentas.
function kickClientId() {
  const bundled = path.join(process.env.TIKTOK_RESOURCES_PATH || path.join(__dirname, '..'), 'oauth-config.json');
  return resolveConfigValue({ envVars: ['KICK_CLIENT_ID'], bundledFile: bundled, field: 'kickClientId' });
}

function autenticarConKick() {
  const { codeVerifier, codeChallenge } = generarPKCE();
  return autenticarConLoopback({
    puerto: PUERTO,
    host: 'localhost', // tiene que ser el mismo string registrado en Kick
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: kickClientId(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        // Kick lo marca obligatorio ("Yes (at the moment)" en su doc) a
        // diferencia de Google/Twitch; sin el, /oauth/authorize no tira un
        // error claro, redirige a id.kick.com (404). No se valida al volver
        // (PKCE ya cubre la integridad del code), solo necesita estar presente.
        state: crypto.randomBytes(16).toString('hex'),
      });
      return `https://id.kick.com/oauth/authorize?${params}`;
    },
  }).then(({ code, redirectUri }) => ({ code, codeVerifier, redirectUri }));
}

module.exports = { autenticarConKick };
