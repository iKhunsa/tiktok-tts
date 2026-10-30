'use strict';

function youtubeMeta(raw) {
  const thumbnail = raw.author && raw.author.thumbnail;
  const badge = raw.author && raw.author.badge;
  return {
    avatar: (thumbnail && thumbnail.url) || '',
    isModerator: Boolean(raw.isModerator || raw.isOwner),
    isSubscriber: Boolean(raw.isMembership),
    ...(badge && badge.thumbnail ? { badge: { url: badge.thumbnail.url, label: badge.label || '' } } : {}),
  };
}

module.exports = { youtubeMeta };
