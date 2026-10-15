'use strict';

const { viewerStats } = require('./viewer-stats');

function listViewers(viewers, query = {}) {
  const matching = viewers.filter((viewer) => matchesViewer(viewer, query));
  const offset = Number(query.offset) || 0;
  const limit = Number(query.limit) || 100;
  return { items: matching.slice(offset, offset + limit), total: matching.length, counts: viewerStats(viewers) };
}

function matchesViewer(viewer, { tab = 'all', platform = 'all', q = '' }) {
  const follows = viewer.isFollower || viewer.isWhitelisted;
  return (tab !== 'followers' || follows)
    && (tab !== 'others' || !follows)
    && (platform === 'all' || viewer.platform === platform)
    && (!q || viewer.nick.toLowerCase().includes(String(q).toLowerCase()));
}

module.exports = { listViewers };
