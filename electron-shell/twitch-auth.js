'use strict';

// Baile OAuth de Twitch (ver docs/plan-twitch-kick.md). A diferencia de
// Google, Twitch no admite puerto dinamico: el redirect_uri tiene que
// coincidir EXACTO con el registrado en el panel de desarrollador de Twitch.
//
// La app esta registrada en Twitch como cliente "Publico" (no "Confidencial"):
// Twitch NUNCA entrega client_secret para ese tipo -- el intercambio va con
// PKCE, igual que Kick (ver kick-auth.js). El server (servicio-cuentas)
// manda code_verifier en vez de client_secret al pedir el token.

const path = require('path');
const { generarPKCE } = require('./pkce');
const { autenticarConLoopback } = require('./oauth-loopback');
const { resolveConfigValue } = require('./resolve-config-value');

const PUERTO = 17623;
const SCOPE = 'user:read:chat user:write:chat channel:read:subscriptions bits:read';

// Publico, bakeado igual que oauth-config.json#googleClientId (ver
// google-auth.js). Mismo client_id que TWITCH_CLIENT_ID en servicio-cuentas.
function twitchClientId() {
  const bundled = path.join(process.env.TIKTOK_RESOURCES_PATH || path.join(__dirname, '..'), 'oauth-config.json');
  return resolveConfigValue({ envVars: ['TWITCH_CLIENT_ID'], bundledFile: bundled, field: 'twitchClientId' });
}

function autenticarConTwitch() {
  const { codeVerifier, codeChallenge } = generarPKCE();
  return autenticarConLoopback({
    puerto: PUERTO,
    host: 'localhost', // tiene que ser el mismo string registrado en Twitch
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: twitchClientId(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      return `https://id.twitch.tv/oauth2/authorize?${params}`;
    },
  }).then(({ code, redirectUri }) => ({ code, codeVerifier, redirectUri }));
}

module.exports = { autenticarConTwitch };
