'use strict';

const TEST_USERS = ['SubKing', 'TwitchFan', 'PogViewer', 'StreamLover', 'ChatHero'];

const VARIANTS = [
  { kind: 'sub-nueva', subType: 'new', tier: 1, tierLabel: 'Tier 1', isPrime: false },
  { kind: 'sub-nueva', subType: 'new', tier: 'prime', tierLabel: 'Prime', isPrime: true },
  { kind: 'sub-resub', subType: 'resub', tier: 1, tierLabel: 'Tier 1', isPrime: false, months: Math.floor(Math.random() * 24) + 2 },
  { kind: 'sub-regalo', subType: 'gift', tier: 1, tierLabel: 'Tier 1', isPrime: false, recipient: 'LuckyViewer' + Math.floor(Math.random() * 99) },
  { kind: 'sub-misterio', subType: 'mysterygift', tier: 1, tierLabel: 'Tier 1', isPrime: false, giftCount: Math.floor(Math.random() * 10) + 1 },
];

function testSub(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
    const v = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    const { kind, ...raw } = v;
    bus.emit('canal:evento-especial', { platform: 'twitch', channel: 'test', kind, raw: { username: user, ...raw } });
    logger.log('info', 'overlay', 'overlay/routes/test-sub.js#testSub', 'overlay.test.disparado', 'Test sub disparado', { tipo: 'sub', payload: { user, subType: v.subType } });
    res.json({ success: true, user, ...v });
  };
}

module.exports = { testSub };
