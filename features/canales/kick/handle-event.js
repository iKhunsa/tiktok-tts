'use strict';

/**
 * Parsea el `data` (string JSON) de un App\Events\ChatMessageEvent de Pusher a
 * la forma cruda que espera chat/emit-chat-message.js#extractKickMessage:
 *   { id, userId, username, content }
 *
 * `content` se deja tal cual lo manda Kick (con los tokens `[emote:ID:nombre]`
 * sin expandir) — la conversion a `:nombre:` + mapa de urls la hace
 * extractKickMessage, igual que Twitch/YouTube resuelven sus emotes ahi.
 */
function parseKickChatMessage(dataStr) {
  let p;
  try {
    p = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
  } catch (_) {
    return null;
  }
  if (!p || !p.id) return null;

  const content = String(p.content || '').trim();
  if (!content) return null;

  const sender = p.sender || {};
  const username = String(sender.username || sender.slug || '').trim();
  if (!username) return null;

  return {
    id: String(p.id),
    // Kick si expone un id numerico estable del usuario (a diferencia del
    // scraping viejo de corard.tv) — /moderacion lo usa como clave firme.
    userId: sender.id != null ? String(sender.id) : null,
    username,
    content,
  };
}

module.exports = { parseKickChatMessage };
