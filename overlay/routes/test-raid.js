'use strict';

const TEST_USERS = ['RaidLeader', 'StreamerAmigo', 'BigRaider', 'TwitchPartner'];

function testRaid(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
    const viewers = Math.floor(Math.random() * 500) + 5;
    bus.emit('canal:evento-especial', { platform: 'twitch', channel: 'test', kind: 'raid', raw: { username: user, viewers } });
    logger.log('info', 'overlay', 'overlay/routes/test-raid.js#testRaid', 'overlay.test.disparado', 'Test raid disparado', { tipo: 'raid', payload: { user, viewers } });
    res.json({ success: true, user, viewers });
  };
}

module.exports = { testRaid };
