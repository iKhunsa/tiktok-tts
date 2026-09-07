'use strict';

const { PLATFORMS } = require('./state');
const { parseKey } = require('./parse-key');

function normalizeRecord(key, v) {
  const parsed = parseKey(key) || { platform: 'tiktok', id: '', idKind: 'name' };
  return {
    p: PLATFORMS.includes(v.p) ? v.p : parsed.platform,
    uid: typeof v.uid === 'string' ? v.uid : parsed.id,
    idk: v.idk === 'id' || v.idk === 'name' ? v.idk : parsed.idKind,
    nick: typeof v.nick === 'string' ? v.nick : parsed.id,
    first: Number(v.first) || 0,
    last: Number(v.last) || 0,
    msgs: Number(v.msgs) || 0,
    gifts: Number(v.gifts) || 0,
    likes: Number(v.likes) || 0,
    fol: !!v.fol,
    folAt: Number(v.folAt) || 0,
    wl: !!v.wl,
    mute: Number(v.mute) || 0,
    ban: Number(v.ban) || 0,
  };
}

module.exports = { normalizeRecord };
