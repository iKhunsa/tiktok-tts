'use strict';

// Baile OAuth de Google (Authorization Code + PKCE, sin client secret: la app
// de escritorio es un "cliente publico"). Puerto dinamico (Google acepta
// cualquiera en apps de escritorio) — ver electron-shell/oauth-loopback.js
// para el server loopback compartido con Twitch/Kick.

const { generarPKCE } = require('./pkce');
const { autenticarConLoopback } = require('./oauth-loopback');

const GOOGLE_CLIENT_ID = '...'; // publico

function autenticarConGoogle() {
  const { codeVerifier, codeChallenge } = generarPKCE();
  return autenticarConLoopback({
    puerto: 0,
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
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
