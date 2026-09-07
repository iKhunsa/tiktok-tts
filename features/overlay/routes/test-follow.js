'use strict';

const TEST_USERS = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];

function testFollow(deps) {
  return (req, res) => {
    const { bus, logger } = deps;
    const platform = ['tiktok', 'twitch'].includes(req.query.platform || (req.body && req.body.platform))
      ? (req.query.platform || req.body.platform) : 'tiktok';
    const user = (req.body && req.body.user) || TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
    const userId = (req.body && req.body.userId) || null;

    // Reusa el evento canonico: /moderacion (Fase 5) y /overlay reaccionan igual
    // que ante un follow real, sin que esta ruta toque el store directo.
    bus.emit('canal:follow', { platform, channel: 'test', userId, nick: user });

    logger.log('info', 'overlay', 'overlay/routes/test-follow.js#testFollow', 'overlay.test.disparado', 'Test follow disparado', { tipo: 'follow', payload: { user, platform } });
    res.json({ success: true, user, platform });
  };
}

module.exports = { testFollow };
