'use strict';

const { keyFor } = require('./key-for');
const { parseKey } = require('./parse-key');

function ensure(state, { platform, userId, nick, key }) {
  const k = key || keyFor(platform, userId, nick);
  let v = state.viewers.get(k);
  if (!v) {
    const parsed = parseKey(k);
    const t = Date.now();
    v = {
      p: parsed ? parsed.platform : 'tiktok',
      uid: userId ? String(userId) : (parsed ? parsed.id : ''),
      idk: parsed ? parsed.idKind : 'name',
      nick: nick ? String(nick) : (parsed ? parsed.id : ''),
      first: t,
      last: t,
      msgs: 0,
      gifts: 0,
      likes: 0,
      fol: false,
      folAt: 0,
      wl: false,
      mute: 0,
      ban: 0,
    };
    state.viewers.set(k, v);
  }
  return { key: k, viewer: v };
}

module.exports = { ensure };
