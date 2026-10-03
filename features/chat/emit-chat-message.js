'use strict';

const { adaptMessage } = require('@tiklivetts/chat-guard');
const { getConfigSnapshot } = require('../../core/config-snapshot');
const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { isAdminIdentity } = require('./is-admin-identity');
const { extractAuthorMeta } = require('./author-meta/extract-author-meta');
const { describeModeration } = require('./describe-moderation');
const moderacionPolicy = require('../../core/contracts/moderacion-policy');
const { ADMIN_ANNOUNCE_TEXT, pickAnnounceText } = require('../../core/announce-texts');

let adminAnnounced = false;

function resetAdminAnnounce() {
  adminAnnounced = false;
}

function emitChatMessage({ bus, logger }) {
  return ({ platform, channel, raw } = {}) => {
    if (!raw) return;

    emitSpecialEvent({ bus, platform, channel, raw });
    const verdict = reviewMessage({ logger, platform, raw });

    if (!verdict.message || verdict.action === 'drop') {
      return reportBlocked({ bus, logger, platform, verdict });
    }
    reportMuted({ bus, logger, platform, verdict });
    reportShadow({ bus, logger, platform, verdict });

    const payload = buildPayload({ bus, channel, platform, verdict, raw });
    broadcastMessage(bus, payload);
    announceAdminOnce({ bus, isAdmin: payload.isAdmin });
  };
}

function emitSpecialEvent({ bus, platform, channel, raw }) {
  if (platform !== 'youtube' || !raw.superchat) return;
  bus.emit('canal:evento-especial', {
    platform,
    channel,
    kind: 'superchat',
    raw: { ...raw.superchat, author: raw.author },
  });
}

function reviewMessage({ logger, platform, raw }) {
  try {
    return moderacionPolicy.review({ platform, raw });
  } catch (error) {
    logger.log(
      'error',
      'chat',
      'chat/emit-chat-message.js#reviewMessage',
      'chat.policy_fallo_evaluacion',
      'La politica de chat fallo; mensaje silenciado',
      { platform, error: error.message }
    );
    return fallbackVerdict({ logger, platform, raw });
  }
}

function fallbackVerdict({ logger, platform, raw }) {
  try {
    const message = adaptMessage({ platform, raw });
    if (message && !message.skip) {
      return { action: 'mute', reasons: ['policy-evaluation-failed'], message };
    }
    return adaptationFailed({ logger, platform, error: message && message.skip });
  } catch (error) {
    return adaptationFailed({ logger, platform, error: error.message });
  }
}

function adaptationFailed({ logger, platform, error }) {
  logger.log(
    'error',
    'chat',
    'chat/emit-chat-message.js#fallbackVerdict',
    'chat.policy_fallo_adaptacion',
    'No se pudo adaptar un mensaje sin politica de chat',
    { platform, error }
  );
  return { action: 'drop', reasons: ['message-adaptation-failed'], message: null };
}

function buildPayload({ bus, channel, platform, verdict, raw }) {
  const { message } = verdict;
  const user = displayName(platform, message.author);
  const isAdmin = isAdminIdentity(bus, platform, message.author.handle);
  const { avatar, isModerator, isSubscriber } = extractAuthorMeta(platform, raw);

  return {
    type: 'chat',
    platform,
    channel,
    user,
    userId: message.author.id || null,
    comment: message.text.display,
    ttsComment: message.text.speech,
    emotes: Object.keys(message.emotes).length ? message.emotes : undefined,
    ytMsgId: platform === 'youtube' ? message.messageId : undefined,
    avatar,
    isModerator,
    isSubscriber,
    isFollower: isAdmin || Boolean(verdict.isFollower),
    muted: verdict.action === 'mute',
    ttsBlocked: verdict.action === 'mute',
    isAdmin,
    timestamp: Date.now(),
    moderationKey: verdict.moderationKey || null,
  };
}

function broadcastMessage(bus, payload) {
  bus.emit('chat:mensaje-recibido', payload);
  bus.emit('chat:mensaje-permitido', payload);
  bus.emit('ws:broadcast', payload);
}

function announceAdminOnce({ bus, isAdmin }) {
  if (!isAdmin || adminAnnounced) return;
  adminAnnounced = true;
  const config = getConfigSnapshot(bus);
  bus.emit('ws:broadcast', {
    type: 'admin-announce',
    text: pickAnnounceText(ADMIN_ANNOUNCE_TEXT, config.ttsVoiceLang),
    texts: ADMIN_ANNOUNCE_TEXT,
    timestamp: Date.now(),
  });
}

function reportBlocked({ bus, logger, platform, verdict }) {
  const detail = describeModeration(verdict.reasons) || { origen: 'guard-js', motivo: verdict.reasons[0] || 'unknown' };
  const entry = moderationEntry({ platform, verdict, accion: 'drop', detail });
  logModeration(logger, entry);
  bus.emit('chat:mensaje-bloqueado', { ...entry, userId: verdict.message && verdict.message.author.id });
  if (verdict.message) broadcastModeration(bus, entry);
}

function reportMuted({ bus, logger, platform, verdict }) {
  if (verdict.action !== 'mute') return;
  const detail = describeModeration(verdict.reasons);
  if (!detail) return;
  const entry = moderationEntry({ platform, verdict, accion: 'mute', detail });
  logModeration(logger, entry);
  broadcastModeration(bus, entry);
}

// Rust en modo aviso: el mensaje pasa, pero se muestra aparte como "detectado".
function reportShadow({ bus, verdict, platform }) {
  if (!verdict.shadow) return;
  const detail = { origen: 'motor-rust', motivo: verdict.shadow.category || 'sin_categoria' };
  broadcastModeration(bus, moderationEntry({ platform, verdict, accion: 'shadow', detail }));
}

// Entrada en memoria del cliente: lleva texto y nick (solo por WS, nunca al log ni a disco).
function moderationEntry({ platform, verdict, accion, detail }) {
  const author = verdict.message && verdict.message.author;
  return {
    platform,
    accion,
    origen: detail.origen,
    motivo: detail.motivo,
    nick: author ? displayName(platform, author) : null,
    text: verdict.message ? verdict.message.text.display : '',
    timestamp: Date.now(),
  };
}

// Sin texto ni nick (privacidad). Alimenta counters.js / aptabase.
function logModeration(logger, { platform, accion, origen, motivo }) {
  logger.log(
    'info',
    'moderacion',
    'chat/emit-chat-message.js#logModeration',
    'moderacion.filtro.mensaje_bloqueado',
    'Mensaje filtrado por moderacion',
    { platform, accion, origen, motivo }
  );
}

function broadcastModeration(bus, entry) {
  bus.emit('ws:broadcast', { type: 'moderation-blocked', ...entry });
}

function displayName(platform, author) {
  if (platform === 'tiktok') {
    return resolveDisplayName(author.displayName, author.handle);
  }
  return cleanName(author.displayName || author.handle) || 'USER';
}

module.exports = { emitChatMessage, resetAdminAnnounce };
