'use strict';

// Frames del protocolo JSON de Centrifugo que usa el chat de Kick. Cada
// comando lleva un `id` y el servidor responde con el mismo `id`. El
// servidor manda `{}` como ping cada ~25 s y espera `{}` de vuelta (pong).
// Un mismo mensaje del WS puede traer varios frames separados por '\n'.

const CONNECT_ID = 1;
const SUBSCRIBE_ID = 2;
const REFRESH_ID = 3;

// Evento de mensaje de chat (nombre de clase PHP de Kick, con backslashes).
const CHAT_MESSAGE_EVENT = 'App\\Events\\ChatMessageEvent';

const PONG_FRAME = '{}';

function connectFrame(token) {
  return JSON.stringify({ id: CONNECT_ID, connect: { token, name: 'js' } });
}

function subscribeFrame(chatroomId) {
  return JSON.stringify({ id: SUBSCRIBE_ID, subscribe: { channel: `chatrooms.${chatroomId}.v2` } });
}

function refreshFrame(token) {
  return JSON.stringify({ id: REFRESH_ID, refresh: { token } });
}

function parseFrames(buf) {
  const frames = [];
  for (const line of buf.toString().split('\n')) {
    if (!line) continue;
    try { frames.push(JSON.parse(line)); } catch (_) { /* frame invalido, se ignora */ }
  }
  return frames;
}

module.exports = {
  CONNECT_ID, SUBSCRIBE_ID, REFRESH_ID, CHAT_MESSAGE_EVENT, PONG_FRAME, connectFrame, subscribeFrame, refreshFrame, parseFrames,
};
