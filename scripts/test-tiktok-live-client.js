'use strict';

// Prueba de integracion AISLADA de @tiklivetts/tiktok-live-client dentro del
// mismo runtime de Electron que usa la app real (mismo package.json, misma
// version de Electron) — no pasa por /canales ni por el resto del dominio,
// solo conecta el cliente directo y loguea lo que llega.
// Uso: node_modules/.bin/electron scripts/test-tiktok-live-client.js <usuario>

const { app } = require('electron');
const { TikTokLiveClient } = require('@tiklivetts/tiktok-live-client');

app.on('window-all-closed', () => {}); // no quiere quedarse sin ventana y matar el proceso

const username = process.argv[2];
if (!username) {
  console.error('Uso: node_modules/.bin/electron scripts/test-tiktok-live-client.js <usuario>');
  process.exit(1);
}

async function main() {
  await app.whenReady();
  console.log(`[tiktok-live-client test] Conectando a ${username}...`);
  const client = new TikTokLiveClient(username);

  let count = 0;
  const tick = (label) => (data) => {
    count++;
    console.log(`[${count}] ${label}`, data);
  };
  client.on('chat', tick('CHAT'));
  client.on('gift', tick('GIFT'));
  client.on('like', tick('LIKE'));
  client.on('member', tick('MEMBER'));
  client.on('follow', tick('FOLLOW'));
  client.on('share', tick('SHARE'));
  client.on('roomUserSeq', tick('ROOM_USER_SEQ'));
  client.on('disconnected', () => console.log('[tiktok-live-client test] DISCONNECTED'));
  client.on('streamEnd', () => console.log('[tiktok-live-client test] STREAM_END'));
  client.on('error', (err) => console.error('[tiktok-live-client test] ERROR', err.code || '', err.message));

  const { roomInfo } = await client.connect();
  console.log('[tiktok-live-client test] Conectado. followerCount:', roomInfo && roomInfo.owner && roomInfo.owner.follow_info && roomInfo.owner.follow_info.follower_count);

  setTimeout(() => {
    console.log(`[tiktok-live-client test] Fin de la prueba — ${count} eventos recibidos en total.`);
    client.disconnect();
    app.quit();
  }, 60_000);
}

main().catch((err) => {
  console.error('[tiktok-live-client test] Fallo:', err);
  process.exit(1);
});
