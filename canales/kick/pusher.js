'use strict';

// Kick usa Pusher (cluster us2, app key publica del cliente web) para el chat
// en tiempo real. No hay auth: los canales de chat son publicos. Mismos
// valores que usa el front de kick.com y los overlays de terceros.
const PUSHER_URL = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';

// Evento de mensaje de chat (nombre de clase PHP de Kick, con backslashes).
const CHAT_MESSAGE_EVENT = 'App\\Events\\ChatMessageEvent';

function subscribeFrame(chatroomId) {
  return JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${chatroomId}.v2` } });
}

function unsubscribeFrame(chatroomId) {
  return JSON.stringify({ event: 'pusher:unsubscribe', data: { channel: `chatrooms.${chatroomId}.v2` } });
}

const PING_FRAME = JSON.stringify({ event: 'pusher:ping', data: {} });

module.exports = { PUSHER_URL, CHAT_MESSAGE_EVENT, subscribeFrame, unsubscribeFrame, PING_FRAME };
