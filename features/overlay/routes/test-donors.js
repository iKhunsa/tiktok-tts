'use strict';

const { addTopEntry } = require('../state/add-top-entry');
const { broadcastTopDonors } = require('../state/broadcast-top-donors');
const { testAvatar } = require('../../../core/test-avatar');

const TEST_USERS = ['GiftKing', 'BigSpender', 'RoseLover', 'LionDonor', 'SuperFan', 'Generous', 'TopGifter', 'MegaDonor'];

function testDonors(deps) {
  return (_req, res) => {
    const { state, bus, logger } = deps;
    const count = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < count; i++) {
      const user = TEST_USERS[i % TEST_USERS.length] + Math.floor(Math.random() * 99);
      addTopEntry(state.topDonors, 'totalCoins', { user, amount: Math.floor(Math.random() * 990) + 10, avatar: testAvatar(user) });
    }
    broadcastTopDonors(bus, state.topDonors);
    logger.log('info', 'overlay', 'overlay/routes/test-donors.js#testDonors', 'overlay.test.disparado', 'Test donadores disparado', { tipo: 'donors', payload: { count } });
    res.json({ success: true, count });
  };
}

module.exports = { testDonors };
