'use strict';

const { PLATFORMS } = require('./state');

function parseKey(key) {
  const raw = String(key || '');
  const idx = raw.indexOf(':');
  if (idx <= 0) return null;
  const platform = raw.slice(0, idx);
  if (!PLATFORMS.includes(platform)) return null;
  let rest = raw.slice(idx + 1);
  let idKind = 'id';
  if (rest.startsWith('name:')) {
    idKind = 'name';
    rest = rest.slice(5);
  }
  if (!rest) return null;
  return { platform, id: rest, idKind };
}

module.exports = { parseKey };
