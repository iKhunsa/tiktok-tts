'use strict';

const { isActive } = require('./is-active');
const { toDTO } = require('./to-dto');

const SORTS = {
  last: (v) => v.last,
  first: (v) => v.first,
  msgs: (v) => v.msgs,
  gifts: (v) => v.gifts,
  likes: (v) => v.likes,
  nick: (v) => String(v.nick || '').toLowerCase(),
};

function list(state, query = {}) {
  const {
    tab = 'all',
    platform = 'all',
    state: stateFilter = 'all',
    q = '',
    sort = 'last',
    dir = 'desc',
    limit = 100,
    offset = 0,
  } = query;

  const needle = String(q || '').trim().toLowerCase();
  const counts = { followers: 0, others: 0, muted: 0, banned: 0 };
  const matched = [];

  for (const [key, v] of state.viewers) {
    const follower = v.fol || v.wl;
    if (follower) counts.followers++; else counts.others++;
    if (isActive(v.mute)) counts.muted++;
    if (isActive(v.ban)) counts.banned++;

    if (tab === 'followers' && !follower) continue;
    if (tab === 'others' && follower) continue;
    if (platform !== 'all' && v.p !== platform) continue;
    if (stateFilter === 'muted' && !isActive(v.mute)) continue;
    if (stateFilter === 'banned' && !isActive(v.ban)) continue;
    if (stateFilter === 'punished' && !isActive(v.mute) && !isActive(v.ban)) continue;
    if (stateFilter === 'clean' && (isActive(v.mute) || isActive(v.ban))) continue;
    if (needle && !String(v.nick || '').toLowerCase().includes(needle)) continue;
    matched.push([key, v]);
  }

  const pick = SORTS[sort] || SORTS.last;
  const sign = dir === 'asc' ? 1 : -1;
  matched.sort((a, b) => {
    const va = pick(a[1]);
    const vb = pick(b[1]);
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return 0;
  });

  const start = Math.max(0, Number(offset) || 0);
  const end = start + Math.max(1, Number(limit) || 100);
  return {
    items: matched.slice(start, end).map(([key, v]) => toDTO(state, key, v)),
    total: matched.length,
    counts,
  };
}

module.exports = { list };
