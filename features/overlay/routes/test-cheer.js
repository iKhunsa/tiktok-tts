'use strict';

const TEST_USERS = ['BitsMaster', 'CheerFan', 'PogChamp', 'BitLover', 'HypeTrain'];
const BIT_OPTIONS = [100, 500, 1000, 5000];

function testCheer(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
    const bits = BIT_OPTIONS[Math.floor(Math.random() * BIT_OPTIONS.length)];
    bus.emit('canal:evento-especial', { platform: 'twitch', channel: 'test', kind: 'cheer', raw: { username: user, bits, message: '¡Toma tus bits!' } });
    logger.log('info', 'overlay', 'overlay/routes/test-cheer.js#testCheer', 'overlay.test.disparado', 'Test cheer disparado', { tipo: 'cheer', payload: { user, bits } });
    res.json({ success: true, user, bits });
  };
}

module.exports = { testCheer };
