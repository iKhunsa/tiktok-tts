'use strict';

function viewers(store) {
  return (req, res) => {
    const q = req.query || {};
    const limit = Math.min(500, Math.max(1, parseInt(q.limit, 10) || 100));
    res.json(store.list({
      tab: ['followers', 'others', 'all'].includes(q.tab) ? q.tab : 'all',
      platform: ['tiktok', 'twitch', 'youtube'].includes(q.platform) ? q.platform : 'all',
      state: ['muted', 'banned', 'punished', 'clean', 'all'].includes(q.state) ? q.state : 'all',
      q: typeof q.q === 'string' ? q.q : '',
      sort: q.sort,
      dir: q.dir === 'asc' ? 'asc' : 'desc',
      limit,
      offset: Math.max(0, parseInt(q.offset, 10) || 0),
    }));
  };
}

module.exports = { viewers };
