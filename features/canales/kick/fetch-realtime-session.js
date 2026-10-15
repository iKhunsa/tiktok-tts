'use strict';

const { randomUUID } = require('crypto');

// Kick sirve su tiempo real con Centrifugo propio (2026-10, reemplazo a
// Pusher). La web pide primero el endpoint del WebSocket y despues un token
// de invitado (`sub: guest:<client_id>`) — sin login ni OAuth. Si Kick cambia
// el handshake, este es el unico punto a parchear.
const API_BASE = 'https://web.kick.com/api';

async function postJson(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Kick: la API de tiempo real respondio ${res.status}`);
  return res.json();
}

async function fetchKickRealtimeSession(channelId) {
  const clientId = randomUUID();
  const conn = await postJson(`/v1/realtime/channels/${encodeURIComponent(channelId)}/chat/connection`, {
    client: { id: clientId, type: 'web' },
    capabilities: { accepted_providers: [{ provider: 'centrifugo' }] },
  });
  const centrifugo = ((conn.data && conn.data.connections) || []).find((c) => c.provider === 'centrifugo');
  const url = centrifugo && centrifugo.credentials && centrifugo.credentials.url;
  if (!url) throw new Error('Kick: la API no ofrecio un servidor de chat compatible');

  return { url, clientId, token: await fetchKickGuestToken(clientId) };
}

// El token de invitado caduca (~45 min). Para renovarlo hay que pedir otro con
// el MISMO clientId: Centrifugo exige que el `sub` no cambie al refrescar.
async function fetchKickGuestToken(clientId) {
  const auth = await postJson('/v1/realtime/auth/connection', { client_id: clientId });
  const token = auth.data && auth.data.token;
  if (!token) throw new Error('Kick: no se pudo obtener el token de chat');
  return token;
}

module.exports = { fetchKickRealtimeSession, fetchKickGuestToken };
