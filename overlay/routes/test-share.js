'use strict';

const TEST_USERS = ['ShareKing', 'ViralFan', 'StreamShare', 'TikToker', 'TopViewer'];

function testShare(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
    bus.emit('canal:evento-especial', { platform: 'tiktok', channel: 'test', kind: 'share', userId: null, nick: user });
    logger.log('info', 'overlay', 'overlay/routes/test-share.js#testShare', 'overlay.test.disparado', 'Test share disparado', { tipo: 'share', payload: { user } });
    res.json({ success: true, user });
  };
}

module.exports = { testShare };
