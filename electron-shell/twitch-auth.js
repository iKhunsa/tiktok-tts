'use strict';

// Baile OAuth de Twitch (ver docs/plan-twitch-kick.md). A diferencia de
// Google, Twitch no admite puerto dinamico: el redirect_uri tiene que
// coincidir EXACTO con el registrado en el panel de desarrollador de Twitch.

const { autenticarConLoopback } = require('./oauth-loopback');

const TWITCH_CLIENT_ID = '...'; // publico
const PUERTO = 17623;
const SCOPE = 'user:read:chat user:write:chat channel:read:subscriptions bits:read';

function autenticarConTwitch() {
  return autenticarConLoopback({
    puerto: PUERTO,
    host: 'localhost', // tiene que ser el mismo string registrado en Twitch
    construirAuthUrl: (redirectUri) => {
      const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
      });
      return `https://id.twitch.tv/oauth2/authorize?${params}`;
    },
  });
}

module.exports = { autenticarConTwitch };
