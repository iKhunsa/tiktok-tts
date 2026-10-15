'use strict';

function youtubeMeta(raw) {
  const thumbnail = raw.author && raw.author.thumbnail;
  return {
    avatar: (thumbnail && thumbnail.url) || '',
    isModerator: Boolean(raw.isModerator || raw.isOwner),
    isSubscriber: Boolean(raw.isMembership),
  };
}

module.exports = { youtubeMeta };
