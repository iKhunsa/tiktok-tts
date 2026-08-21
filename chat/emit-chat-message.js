'use strict';

const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { sanitizeForTTS } = require('./sanitize-for-tts');
const { normalizeForModeration } = require('./normalize-for-moderation');
const { isAdminIdentity } = require('./is-admin-identity');
const moderacionPolicyContract = require('../core/contracts/moderacion-policy');

const ADMIN_ANNOUNCE_TEXT = 'Aviso del sistema: el creador de TikLive TTS acaba de ingresar.';
const adminAnnouncedSessions = new Set();

function extractTiktokMessage(raw) {
  const comment = String(raw.comment || '').trim();
  if (!comment) return null;
  return {
    user: resolveDisplayName(raw.nickname, raw.uniqueId),
    userId: raw.uniqueId || null,
    comment,
    ttsComment: sanitizeForTTS(comment),
    emotes: undefined,
    ytMsgId: undefined,
  };
}

function extractTwitchMessage(raw) {
  const tags = raw.tags || {};
  const text = String(raw.message || '').trim();
  if (!text) return null;

  const emotes = {};
  if (tags.emotes) {
    for (const [emoteId, positions] of Object.entries(tags.emotes)) {
      const range = Array.isArray(positions) ? positions[0] : String(positions).split('/')[0];
      const [start, end] = String(range || '').split('-').map(Number);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
      if (start < 0 || end < start || end >= text.length) continue;
      const name = text.substring(start, end + 1);
      if (name) emotes[name] = { url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0` };
    }
  }

  const sanitized = sanitizeForTTS(text);
  return {
    user: cleanName(tags['display-name'] || tags.username || 'Anónimo'),
    userId: tags['user-id'] || null,
    comment: sanitized,
    ttsComment: sanitized,
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
    ttsComment: ttsText ? sanitizeForTTS(ttsText) : undefined,
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: item.id || undefined,
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

    if (isAdmin && !adminAnnouncedSessions.has(platform)) {
      adminAnnouncedSessions.add(platform);
      bus.emit('ws:broadcast', { type: 'admin-announce', text: ADMIN_ANNOUNCE_TEXT, timestamp: Date.now() });
    }
  };
}

module.exports = { emitChatMessage };
