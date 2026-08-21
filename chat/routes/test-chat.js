'use strict';

/**
 * Inyecta un mensaje sintetico por el mismo camino (bus.emit('canal:mensaje-crudo'))
 * que el chat real, para probar el flujo completo sin plataformas conectadas.
 */
function testChat(deps) {
  return (req, res) => {
    const { bus, logger } = deps;
    const b = req.body || {};
    const platform = ['tiktok', 'twitch', 'youtube'].includes(b.platform) ? b.platform : 'tiktok';
    const user = String(b.user || 'TestUser').trim();
    const comment = String(b.comment || '').trim();
    if (!comment) return res.status(400).json({ error: 'comment requerido' });

    let raw;
    if (platform === 'tiktok') {
      raw = { nickname: user, uniqueId: b.userId || null, comment };
    } else if (platform === 'twitch') {
      raw = { tags: { 'display-name': user, username: user, 'user-id': b.userId || null }, message: comment };
    } else {
      raw = { author: { name: user, channelId: b.userId || null }, message: [{ text: comment }], id: `test-${Date.now()}` };
    }

    bus.emit('canal:mensaje-crudo', { platform, channel: 'test', raw });

    logger.log(
      'info', 'chat', 'chat/routes/test-chat.js#testChat', 'chat.test.inyectado',
      `Mensaje de prueba inyectado para ${user} (${platform})`, { platform, user }
    );
    res.json({ success: true, user, platform });
  };
}

module.exports = { testChat };
