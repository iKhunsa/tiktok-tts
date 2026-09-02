'use strict';

const { formatDuration } = require('../format-duration');

function toTrack(j) {
  if (!j || !j.id) return null;
  const secs = Math.round(Number(j.duration) || 0);
  const thumb = j.thumbnail
    || (Array.isArray(j.thumbnails) && j.thumbnails.length ? j.thumbnails[j.thumbnails.length - 1].url : '')
    || `https://i.ytimg.com/vi/${j.id}/mqdefault.jpg`;
  return {
    videoId: j.id,
    title: j.title || '',
    channelName: j.channel || j.uploader || '',
    thumbnail: thumb,
    duration: formatDuration(secs),
  };
}

module.exports = { toTrack };
