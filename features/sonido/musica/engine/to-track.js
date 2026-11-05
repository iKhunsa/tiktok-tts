'use strict';

const { formatDuration } = require('../format-duration');
const { youtubeThumbnail } = require('../youtube-thumbnail');

function toTrack(j) {
  if (!j || !j.id) return null;
  const secs = Math.round(Number(j.duration) || 0);
  const thumb = j.thumbnail || youtubeThumbnail(j.id);
  return {
    videoId: j.id,
    title: j.title || '',
    channelName: j.channel || j.uploader || '',
    thumbnail: thumb,
    duration: formatDuration(secs),
  };
}

module.exports = { toTrack };
