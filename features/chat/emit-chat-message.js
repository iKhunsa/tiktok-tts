'use strict';

const { adaptMessage } = require('@tiklivetts/chat-guard');
const { getConfigSnapshot } = require('../../core/config-snapshot');
const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { isAdminIdentity } = require('./is-admin-identity');
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

    const payload = buildPayload({ bus, channel, platform, verdict });
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
  } catch (error) {
    logger.log(
      'error',
      'chat',
      'chat/emit-chat-message.js#fallbackVerdict',
      'chat.policy_fallo_adaptacion',
      'No se pudo adaptar un mensaje sin politica de chat',
      { platform, error: error.message }
    );
  }
  return { action: 'drop', reasons: ['message-adaptation-failed'], message: null };
}

function buildPayload({ bus, channel, platform, verdict }) {
  const { message } = verdict;
  const user = displayName(platform, message.author);
  const isAdmin = isAdminIdentity(bus, platform, message.author.handle);

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
  const author = verdict.message && verdict.message.author;
  const userId = author && author.id;
  const nick = author && displayName(platform, author);
  const motivo = verdict.reasons[0] || 'unknown';
  logger.log(
    'info',
    'chat',
    'chat/emit-chat-message.js#reportBlocked',
    'chat.mensaje.bloqueado',
    'Mensaje bloqueado por moderacion',
    { platform, userId, nick, motivo }
  );
  bus.emit('chat:mensaje-bloqueado', { platform, userId, nick, motivo });
}

function displayName(platform, author) {
  if (platform === 'tiktok') {
    return resolveDisplayName(author.displayName, author.handle);
  }
  return cleanName(author.displayName || author.handle) || 'USER';
}

module.exports = { emitChatMessage, resetAdminAnnounce };
