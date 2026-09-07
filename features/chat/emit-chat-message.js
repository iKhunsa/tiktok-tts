'use strict';

const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { sanitizeForTTS } = require('./sanitize-for-tts');
const { normalizeForModeration } = require('./normalize-for-moderation');
const { isAdminIdentity } = require('./is-admin-identity');
const moderacionPolicyContract = require('../../core/contracts/moderacion-policy');
const { ADMIN_ANNOUNCE_TEXT, pickAnnounceText } = require('../../core/announce-texts');

// Global (no por plataforma): si el creador transmite simultaneo en 4
// plataformas y escribe en todas, el aviso debe sonar una sola vez, no una
// por cada plataforma donde se detecto su identidad admin. Se resetea cuando
// se cae el ultimo canal conectado (ver chat/index.js#register, listener de
// canal:estado) para que una desconexion total + reconexion cuente como
// sesion nueva y vuelva a anunciar.
let adminAnnounced = false;

function resetAdminAnnounce() {
  adminAnnounced = false;
}

// Los "emojis de TikTok" (set propio: [Happy], [Smile], [Loveface]...) llegan
// dentro de `comment` como palabras entre corchetes, no como emoji unicode —
// sanitizeForTTS no los toca porque son letras. Se quitan del texto que lee el
// TTS (no del que se muestra en el chat, ahi el corchete es el fallback que
// usa la propia app de TikTok). El emoji unicode nativo si lo filtra sanitize.
const TIKTOK_EMOTE_TOKEN = /\[[A-Za-z]{1,20}\]/g;

function stripTiktokEmoteTokens(text) {
  return text.replace(TIKTOK_EMOTE_TOKEN, ' ');
}

function extractTiktokMessage(raw) {
  const comment = String(raw.comment || '').trim();
  if (!comment) return null;
  return {
    user: resolveDisplayName(raw.nickname, raw.uniqueId),
    userId: raw.uniqueId || null,
    comment,
    // Siempre string (aunque quede vacio si el mensaje era solo emojis de
    // TikTok) — nunca undefined, para que el front no caiga de vuelta a
    // `comment` y termine leyendo `[Happy]` en voz alta.
    ttsComment: sanitizeForTTS(stripTiktokEmoteTokens(comment)),
    emotes: undefined,
    ytMsgId: undefined,
  };
}

function extractTwitchMessage(raw) {
  const tags = raw.tags || {};
  const text = String(raw.message || '').trim();
  if (!text) return null;

  // tags.emotes: { emoteId: ['start-end', ...] } (o string "start-end/start-end"
  // sin parsear). Se recolectan TODAS las apariciones de TODOS los emotes y se
  // reemplaza cada rango por un token `:nombre:` — mismo formato que YouTube/Kick,
  // para que el renderer de chat las pinte como imagen y sanitizeForTTS pueda
  // quitarlas del texto que lee el TTS (antes quedaban como palabra suelta).
  const occurrences = [];
  if (tags.emotes) {
    for (const [emoteId, positions] of Object.entries(tags.emotes)) {
      const ranges = Array.isArray(positions) ? positions : String(positions).split('/');
      for (const range of ranges) {
        const [start, end] = String(range || '').split('-').map(Number);
        if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
        if (start < 0 || end < start || end >= text.length) continue;
        occurrences.push({ start, end, emoteId, name: text.substring(start, end + 1) });
      }
    }
  }
  occurrences.sort((a, b) => a.start - b.start);

  const emotes = {};
  let displayText = '';
  let cursor = 0;
  for (const occ of occurrences) {
    if (occ.start < cursor || !occ.name) continue; // rango solapado/invalido, se ignora
    const safeName = occ.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    displayText += text.slice(cursor, occ.start) + `:${safeName}:`;
    emotes[safeName] = { url: `https://static-cdn.jtvnw.net/emoticons/v2/${occ.emoteId}/default/dark/1.0` };
    cursor = occ.end + 1;
  }
  displayText += text.slice(cursor);

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName(tags['display-name'] || tags.username || 'Anónimo'),
    userId: tags['user-id'] || null,
    comment: sanitizeForTTS(displayText),
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: undefined,
  };
}

function extractYoutubeMessage(item) {
  const emotes = {};
  const displayParts = [];
  for (const part of (item.message || [])) {
    if (part.text) {
      displayParts.push(part.text);
    } else {
      const rawName = part.emojiText || part.alt || '';
      const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'emoji';
      const url = part.url || '';
      displayParts.push(`:${safeName}:`);
      if (url) emotes[safeName] = { url };
    }
  }
  const displayText = displayParts.join('').trim();
  if (!displayText) return null;

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName((item.author && item.author.name) || 'Anónimo'),
    userId: (item.author && item.author.channelId) || null,
    comment: sanitizeForTTS(displayText),
    // Siempre string (aunque quede vacio si el mensaje es solo emojis/stickers) —
    // nunca undefined, para que el front no caiga de vuelta a `comment` y termine
    // leyendo el token crudo `:nombre:` en voz alta.
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: item.id || undefined,
  };
}

// Kick manda los emotes dentro de `content` como tokens `[emote:ID:nombre]`.
// Se convierten al mismo formato `:nombre:` + mapa de urls que Twitch/YouTube,
// para que el renderer los pinte como imagen y sanitizeForTTS los saque del
// texto que lee el TTS.
const KICK_EMOTE_TOKEN = /\[emote:(\d+):([^\]]*)\]/g;

function extractKickMessage(raw) {
  // raw viene de canales/kick/handle-event.js: { id, userId, username, content }
  const source = String(raw.content || '').trim();
  if (!source) return null;

  const emotes = {};
  const displayText = source.replace(KICK_EMOTE_TOKEN, (_m, id, name) => {
    const safeName = String(name || `emote_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_') || `emote_${id}`;
    emotes[safeName] = { url: `https://files.kick.com/emotes/${id}/fullsize` };
    return `:${safeName}:`;
  }).trim();
  if (!displayText) return null;

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName(raw.username || 'Anónimo'),
    // Kick si expone el id numerico estable del usuario — /moderacion lo usa
    // como clave firme (no cae al castigo fragil por-nombre).
    userId: raw.userId || null,
    comment: sanitizeForTTS(displayText),
    // Siempre string (aunque quede vacio si el mensaje es solo emotes/emoji) —
    // nunca undefined, para que el front no caiga de vuelta a `comment` y
    // termine leyendo el token crudo `:nombre:` o el emoji en voz alta.
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: undefined,
  };
}

/**
 * Orquestador central: llega crudo de /canales, pasa por el veredicto de
 * /moderacion, decide si dispara TTS, publica ya enriquecido. Reemplaza
 * emitChatMessage (backend-viejo/server.js:1489).
 */
function emitChatMessage(deps) {
  return (payload) => {
    const { bus, logger } = deps;
    const { platform, channel, raw } = payload || {};
    if (!raw) return;

    let extracted = null;
    if (platform === 'tiktok') {
      extracted = extractTiktokMessage(raw);
    } else if (platform === 'twitch') {
      extracted = extractTwitchMessage(raw);
    } else if (platform === 'youtube') {
      // Superchat puede venir sin texto (solo monto) — se alerta aparte,
      // independiente de si hay comentario para el chat normal.
      if (raw.superchat) {
        bus.emit('canal:evento-especial', { platform: 'youtube', channel, kind: 'superchat', raw: { ...raw.superchat, author: raw.author } });
      }
      extracted = extractYoutubeMessage(raw);
    } else if (platform === 'kick') {
      extracted = extractKickMessage(raw);
    }
    if (!extracted) return;

    const { user, userId, comment, ttsComment, emotes, ytMsgId } = extracted;
    const isAdmin = isAdminIdentity(bus, platform, userId, user);

    // Registro de interaccion: /moderacion (Fase 5) escucha este evento con
    // el dato ya limpio en vez de parsear el crudo de /canales.
    bus.emit('chat:mensaje-recibido', { platform, userId, nick: user });

    let evaluated;
    try {
      evaluated = moderacionPolicyContract.evaluate({ platform, userId, nick: user, text: normalizeForModeration(comment) });
    } catch (error) {
      // policy.evaluate() ya tiene su propio fail-open interno — esto es
      // defensa en profundidad por si la inyeccion del contrato fallara.
      logger.log(
        'error', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.policy_fallo_evaluacion',
        `moderacionPolicy.evaluate lanzo una excepcion, se trata el mensaje como permitido: ${error.message}`,
        { platform, userId, nick: user, error: error.message, stack: error.stack }
      );
      evaluated = { isSpam: false, isMuted: false, isBanned: false, isFollower: false };
    }

    const veredicto = isAdmin
      ? { isSpam: evaluated.isSpam, isMuted: false, isBanned: false, isFollower: true }
      : evaluated;

    if (veredicto.isBanned) {
      logger.log(
        'info', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.bloqueado',
        `Mensaje bloqueado de ${user} (${platform}): usuario baneado`, { platform, userId, nick: user, motivo: 'user-banned' }
      );
      bus.emit('chat:mensaje-bloqueado', { platform, userId, nick: user, motivo: 'user-banned' });
      return;
    }
    if (veredicto.isSpam) {
      logger.log(
        'info', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.bloqueado',
        `Mensaje bloqueado de ${user} (${platform}): spam`, { platform, userId, nick: user, motivo: 'spam' }
      );
      bus.emit('chat:mensaje-bloqueado', { platform, userId, nick: user, motivo: 'spam' });
      return;
    }

    let config = null;
    bus.emit('config:get', (c) => { config = c; });
    const isFollower = veredicto.isFollower;
    const nonFollowerBlocked = !(config && config.ttsReadNonFollowers) && !isFollower;
    const ttsBlocked = veredicto.isMuted || nonFollowerBlocked;

    const msgId = `${platform}:${userId || user}:${Date.now()}`;
    const enrichedPayload = {
      type: 'chat',
      platform,
      channel,
      user,
      userId: userId || null,
      comment,
      ttsComment,
      emotes,
      ytMsgId,
      isFollower,
      muted: veredicto.isMuted,
      ttsBlocked,
      isAdmin: !!isAdmin,
      timestamp: Date.now(),
    };

    bus.emit('chat:mensaje-permitido', enrichedPayload);
    bus.emit('ws:broadcast', enrichedPayload);

    // Nunca el texto del mensaje, solo identificadores.
    logger.log(
      'debug', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.emitido',
      `Mensaje emitido de ${user} (${platform})`, { platform, userId, nick: user, msgId }
    );

    if (isAdmin && !adminAnnounced) {
      adminAnnounced = true;
      // `text` = pick del backend segun config.ttsVoiceLang (fallback para
      // clientes viejos). `texts` = mapa completo: el cliente resuelve contra
      // su voz TTS real (voiceSelect.value), que es quien lo habla — asi nunca
      // hay desincronizacion config<->voz visible.
      const text = pickAnnounceText(ADMIN_ANNOUNCE_TEXT, config && config.ttsVoiceLang);
      bus.emit('ws:broadcast', { type: 'admin-announce', text, texts: ADMIN_ANNOUNCE_TEXT, timestamp: Date.now() });
    }
  };
}

module.exports = { emitChatMessage, resetAdminAnnounce };
