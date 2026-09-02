'use strict';

const { PLATFORMS } = require('./state');

/**
 * Clave por usuario: `${platform}:${id}`; sin id estable cae a
 * `${platform}:name:${nick}` (idk:'name') — las dos formas nunca se fusionan.
 */
function keyFor(platform, userId, nick) {
  const p = PLATFORMS.includes(platform) ? platform : 'tiktok';
  const id = userId ? String(userId).trim() : '';
  if (id) return `${p}:${id}`;
  const name = String(nick || 'anon').trim().toLowerCase();
  return `${p}:name:${name}`;
}

module.exports = { keyFor };
