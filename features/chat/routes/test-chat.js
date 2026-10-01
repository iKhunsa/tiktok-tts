'use strict';

const crypto = require('crypto');
const { testAvatar } = require('../../../core/test-avatar');

const TEST_PLATFORMS = ['tiktok', 'twitch', 'youtube'];

// Forma cruda de cada plataforma (la que llega en canal:mensaje-crudo), con
// el rol y la foto de prueba donde esa plataforma los transporta.
const RAW_BUILDERS = {
  tiktok: ({ user, userId, comment, messageId, role }) => ({
    nickname: user,
    uniqueId: userId || null,
    comment,
    msgId: messageId,
    avatarUrl: testAvatar(user),
    isFanClubMember: role === 'subscriber',
  }),
  twitch: ({ user, userId, comment, messageId, role }) => ({
    tags: {
      id: messageId,
      'display-name': user,
      username: user,
      'user-id': userId || null,
      mod: role === 'moderator',
      subscriber: role === 'subscriber',
    },
    message: comment,
  }),
  youtube: ({ user, userId, comment, messageId, role }) => ({
    author: { name: user, channelId: userId || null, thumbnail: { url: testAvatar(user) } },
    message: [{ text: comment }],
    id: messageId,
    isModerator: role === 'moderator',
    isMembership: role === 'subscriber',
  }),
};

/**
 * Inyecta un mensaje sintetico por el mismo camino (bus.emit('canal:mensaje-crudo'))
 * que el chat real, para probar el flujo completo sin plataformas conectadas.
 * `role` opcional: 'moderator' | 'subscriber'.
 */
function testChat(deps) {
  return (req, res) => {
    const { bus, logger } = deps;
    const b = req.body || {};
    const platform = TEST_PLATFORMS.includes(b.platform) ? b.platform : 'tiktok';
    const user = String(b.user || 'TestUser').trim();
    const comment = String(b.comment || '').trim();
    if (!comment) return res.status(400).json({ error: 'comment requerido' });

    // Id de mensaje unico por envio, en el campo donde cada plataforma lo trae:
    // sin el, dos simulaciones con el mismo texto y usuario se descartan como reenvio.
    const messageId = `test-${crypto.randomUUID()}`;
    const raw = RAW_BUILDERS[platform]({ user, userId: b.userId, comment, messageId, role: b.role });

    bus.emit('canal:mensaje-crudo', { platform, channel: 'test', raw });

    logger.log(
      'info', 'chat', 'chat/routes/test-chat.js#testChat', 'chat.test.inyectado',
      `Mensaje de prueba inyectado para ${user} (${platform})`, { platform, user }
    );
    res.json({ success: true, user, platform });
  };
}

module.exports = { testChat };
