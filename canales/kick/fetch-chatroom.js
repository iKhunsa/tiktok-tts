'use strict';

const https = require('https');

/**
 * Resuelve el slug de un canal de Kick a los ids que necesita el WebSocket de
 * chat (Pusher): chatroom.id y chatroom.channel_id.
 *
 * Usa el endpoint publico https://kick.com/api/v2/channels/{slug} — al 2026-08
 * responde 200 a peticiones de Node sin headers especiales (el bloqueo de
 * Cloudflare que se documento en CLAUDE.md ya no aplica a esta ruta). Si Kick
 * lo vuelve a cerrar, este es el unico punto a parchear (proxy / navegador).
 */
function fetchKickChatroom(slug) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
      { headers: { Accept: 'application/json' }, timeout: 12000 },
      (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => {
          if (res.statusCode === 404) {
            reject(new Error(`Kick: el canal "${slug}" no existe`));
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Kick: la API respondio ${res.statusCode} para "${slug}"`));
            return;
          }
          let data;
          try {
            data = JSON.parse(body);
          } catch (_) {
            reject(new Error('Kick: respuesta no valida de la API (¿Cloudflare bloqueo la peticion?)'));
            return;
          }
          const chatroom = data && data.chatroom;
          if (!chatroom || !chatroom.id) {
            reject(new Error(`Kick: no se pudo leer el chat de "${slug}"`));
            return;
          }
          resolve({
            chatroomId: chatroom.id,
            channelId: chatroom.channel_id || (data.id ?? null),
            isLive: Boolean(data.livestream),
          });
        });
      }
    );
    req.on('error', (e) => reject(new Error(`Kick: no se pudo contactar la API (${e.message})`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Kick: timeout al contactar la API')); });
  });
}

module.exports = { fetchKickChatroom };
