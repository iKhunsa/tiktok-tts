'use strict';

const TEST_USERS = ['LikeKing', 'FanTotal', 'TikTokLover', 'SuperViewer', 'HeartGiver', 'StreamFan', 'TopLiker', 'MegaFan'];

function testLikes(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const count = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < count; i++) {
      const user = TEST_USERS[i % TEST_USERS.length] + Math.floor(Math.random() * 99);
      const likeCount = Math.floor(Math.random() * 490) + 10;
      bus.emit('ws:broadcast', { type: 'like', user, likeCount, timestamp: Date.now() + i });
    }
    logger.log('info', 'overlay', 'overlay/routes/test-likes.js#testLikes', 'overlay.test.disparado', 'Test likes disparado', { tipo: 'likes', payload: { count } });
    res.json({ success: true, count });
  };
}

module.exports = { testLikes };
