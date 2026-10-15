'use strict';

// Texto tal cual lo escribio el espectador, antes de chat-guard. El display
// de chat-guard reemplaza las URLs por "link" y colapsa letras repetidas, lo
// que rompe comandos que llevan un link (`!p https://youtu.be/...`).
function rawCommentText(platform, raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  let text;
  if (platform === 'tiktok') text = source.comment;
  else if (platform === 'twitch') text = source.message;
  else if (platform === 'kick') text = source.content;
  else if (platform === 'youtube') {
    text = Array.isArray(source.message)
      ? source.message.map((run) => (run && typeof run.text === 'string' ? run.text : '')).join('')
      : source.message;
  }
  return typeof text === 'string' ? text.trim() : '';
}

module.exports = { rawCommentText };
