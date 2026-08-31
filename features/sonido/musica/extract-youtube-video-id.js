'use strict';

function extractYoutubeVideoId(str) {
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = str.match(re);
    if (m) return m[1];
  }
  return null;
}

module.exports = { extractYoutubeVideoId };
