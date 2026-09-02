'use strict';

function stopYoutubeChat(chat, reason = 'stop') {
  if (!chat) return;
  try { chat.stop(reason); } catch (_) { /* best-effort */ }
  try { chat.removeAllListeners(); } catch (_) { /* best-effort */ }
}

module.exports = { stopYoutubeChat };
