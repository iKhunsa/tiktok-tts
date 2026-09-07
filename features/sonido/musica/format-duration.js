'use strict';

// Unica fuente (antes duplicada entre server.js:790 y music-engine.js:16).
function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = { formatDuration };
