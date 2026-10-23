'use strict';

// Baile OAuth de Google (Authorization Code + PKCE, sin client secret: la app
// de escritorio es un "cliente publico"). Puerto dinamico (Google acepta
// cualquiera en apps de escritorio) — ver electron-shell/oauth-loopback.js
// para el server loopback compartido con Twitch/Kick.

const path = require('path');
const { generarPKCE } = require('./pkce');
const { autenticarConLoopback } = require('./oauth-loopback');
const { resolveConfigValue } = require('./resolve-config-value');

// Publico (viaja en la URL de autorizacion que abre el navegador), pero
// bakeado en vez de hardcodeado -- mismo mecanismo que aptabase-config.json,
// resuelto en runtime asi un cambio de proyecto en Google Cloud Console no
// pide tocar codigo. Mismo client_id que usa servicio-cuentas (GOOGLE_CLIENT_ID)
// para el intercambio real del code -- tienen que coincidir, son el mismo OAuth app.
function googleClientId() {
  const bundled = path.join(process.env.TIKTOK_RESOURCES_PATH || path.join(__dirname, '..'), 'oauth-config.json');
  return resolveConfigValue({ envVars: ['GOOGLE_CLIENT_ID'], bundledFile: bundled, field: 'googleClientId' });
}

function autenticarConGoogle() {
  const { codeVerifier, codeChallenge } = generarPKCE();
  return autenticarConLoopback({
    puerto: 0,
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: googleClientId(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'online',
        prompt: 'select_account',
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    },
  }).then(({ code, redirectUri }) => ({ code, codeVerifier, redirectUri }));
}

module.exports = { autenticarConGoogle };
