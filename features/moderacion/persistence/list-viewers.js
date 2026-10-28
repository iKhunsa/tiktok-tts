'use strict';

const { viewerStats } = require('./viewer-stats');

function listViewers(viewers, query = {}) {
  const matching = viewers.filter((viewer) => matchesViewer(viewer, query)).sort(compareBy(query));
  const offset = Number(query.offset) || 0;
  const limit = Number(query.limit) || 100;
  return { items: matching.slice(offset, offset + limit), total: matching.length, counts: viewerStats(viewers) };
}

const STATES = {
  muted: (v) => v.isMuted,
  banned: (v) => v.isBanned,
  punished: (v) => v.isMuted || v.isBanned,
  clean: (v) => !v.isMuted && !v.isBanned,
};

function matchesViewer(viewer, { tab = 'all', platform = 'all', state = 'all', q = '' }) {
  const follows = viewer.isFollower || viewer.isWhitelisted;
  return (tab !== 'followers' || follows)
    && (tab !== 'others' || !follows)
    && (platform === 'all' || viewer.platform === platform)
    && (!STATES[state] || STATES[state](viewer))
    && (!q || viewer.nick.toLowerCase().includes(String(q).toLowerCase()));
}

// 'nick' = alfabetico (asc por defecto); cualquier otro = actividad reciente (desc por defecto).
function compareBy({ sort, dir }) {
  const byNick = sort === 'nick';
  const sign = (dir || (byNick ? 'asc' : 'desc')) === 'asc' ? 1 : -1;
  return byNick
    ? (a, b) => sign * String(a.nick).localeCompare(String(b.nick), undefined, { sensitivity: 'base' })
    : (a, b) => sign * ((a.lastSeen || 0) - (b.lastSeen || 0));
}

module.exports = { listViewers };
