'use strict';

const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { isAdminIdentity } = require('./is-admin-identity');
const moderacionPolicy = require('../../core/contracts/moderacion-policy');
const { ADMIN_ANNOUNCE_TEXT, pickAnnounceText } = require('../../core/announce-texts');

let adminAnnounced = false;
function resetAdminAnnounce() { adminAnnounced = false; }

function emitChatMessage({ bus, logger }) {
  return ({ platform, channel, raw } = {}) => {
    if (!raw) return;
    if (platform === 'youtube' && raw.superchat) bus.emit('canal:evento-especial', { platform, channel, kind: 'superchat', raw: { ...raw.superchat, author: raw.author } });
    let verdict;
    try {
      verdict = moderacionPolicy.review({ platform, raw });
    } catch (error) {
      logger.log('error', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.policy_fallo_evaluacion', 'La politica de chat fallo; mensaje permitido', { platform, error: error.message });
      verdict = fallbackVerdict(platform, raw);
    }
    if (!verdict.message) return blocked(bus, logger, platform, raw, verdict.reasons);
    const { message } = verdict;
    const user = displayName(platform, message.author);
    const isAdmin = isAdminIdentity(bus, platform, message.author.handle);
    if (verdict.action === 'drop' && !isAdmin) return blocked(bus, logger, platform, raw, verdict.reasons, message.author.id, user);
    let config = {};
    bus.emit('config:get', (c) => { config = c || {}; });
    const moderationKey = message.author.id ? `${platform}:id:${message.author.id}` : `${platform}:name:${String(message.author.handle || '').toLowerCase()}`;
    const payload = { type: 'chat', platform, channel, user, userId: message.author.id || null, comment: message.text.display, ttsComment: message.text.speech, emotes: Object.keys(message.emotes).length ? message.emotes : undefined, ytMsgId: platform === 'youtube' ? message.messageId : undefined, isFollower: isAdmin || !!verdict.isFollower, muted: verdict.action === 'mute', ttsBlocked: verdict.action === 'mute', isAdmin, timestamp: Date.now(), moderationKey };
    bus.emit('chat:mensaje-recibido', payload);
    bus.emit('chat:mensaje-permitido', payload);
    bus.emit('ws:broadcast', payload);
    if (isAdmin && !adminAnnounced) {
      adminAnnounced = true;
      bus.emit('ws:broadcast', { type: 'admin-announce', text: pickAnnounceText(ADMIN_ANNOUNCE_TEXT, config.ttsVoiceLang), texts: ADMIN_ANNOUNCE_TEXT, timestamp: Date.now() });
    }
  };
}

function fallbackVerdict(platform, raw) {
  const text = String(raw.comment || raw.message || raw.content || '').slice(0, 300);
  return { action: 'allow', reasons: [], message: text ? { platform, author: { id: raw.uniqueId || raw.userId || (raw.author && raw.author.channelId) || (raw.tags && raw.tags['user-id']) || null, handle: raw.uniqueId || raw.username || (raw.author && raw.author.name) || (raw.tags && raw.tags.username) || '', displayName: raw.nickname || raw.username || (raw.author && raw.author.name) || (raw.tags && raw.tags['display-name']) || '' }, text: { display: text, speech: text }, emotes: {}, messageId: raw.id || null } : null };
}

function displayName(platform, author) { return platform === 'tiktok' ? resolveDisplayName(author.displayName, author.handle) : cleanName(author.displayName || author.handle) || 'USER'; }
function blocked(bus, logger, platform, raw, reasons = [], userId = null, nick = null) { const motivo = reasons[0] || 'unknown'; logger.log('info', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.bloqueado', 'Mensaje bloqueado por moderacion', { platform, userId, nick, motivo }); bus.emit('chat:mensaje-bloqueado', { platform, userId, nick, motivo }); }

module.exports = { emitChatMessage, resetAdminAnnounce };
