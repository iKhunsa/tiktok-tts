'use strict';

// Baile OAuth de Kick (ver docs/plan-twitch-kick.md). Igual que Twitch,
// puerto fijo (registrado de antemano en el panel de Kick) — pero Kick
// exige PKCE ademas del client_secret (que vive en el backend, nunca aca).

const { generarPKCE } = require('./pkce');
const { autenticarConLoopback } = require('./oauth-loopback');

const KICK_CLIENT_ID = '...'; // publico
const PUERTO = 17624;
const SCOPE = 'user:read chat:write events:subscribe';

function autenticarConKick() {
  const { codeVerifier, codeChallenge } = generarPKCE();
  return autenticarConLoopback({
    puerto: PUERTO,
    host: 'localhost', // tiene que ser el mismo string registrado en Kick
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: KICK_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      return `https://id.kick.com/oauth/authorize?${params}`;
    },
  }).then(({ code, redirectUri }) => ({ code, codeVerifier, redirectUri }));
}

module.exports = { autenticarConKick };
