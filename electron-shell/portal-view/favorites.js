'use strict';

function normalizeUrl(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      const url = new URL(candidate);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch (_) { /* probar siguiente */ }
  }
  return null;
}

function findFavoriteByUrl(favorites, url, exceptId) {
  if (!url) return null;
  return favorites.find((favorite) => favorite.id !== exceptId && normalizeUrl(favorite.url) === url);
}

module.exports = { normalizeUrl, findFavoriteByUrl };
