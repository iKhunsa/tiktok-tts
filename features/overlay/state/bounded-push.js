'use strict';

// Los overlays solo muestran los ultimos ~10 de cada lista (ver overlay/index.js).
// Sin este cap, streams largos acumulan memoria sin limite.
const MAX_LIST_LENGTH = 500;

function pushBounded(arr, item, max = MAX_LIST_LENGTH) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

// topLikers es un Map: lo que importa es el ranking por totalLikes, no la
// antiguedad, asi que la purga borra a los que tienen MENOS likes.
const MAX_TOP_LIKERS = 2000;
const TOP_LIKERS_PURGE_TARGET = 1500;

function purgeTopLikersIfNeeded(topLikers) {
  if (topLikers.size <= MAX_TOP_LIKERS) return;
  const sorted = [...topLikers.entries()].sort((a, b) => a[1].totalLikes - b[1].totalLikes);
  const toRemove = sorted.slice(0, topLikers.size - TOP_LIKERS_PURGE_TARGET);
  for (const [key] of toRemove) topLikers.delete(key);
}

module.exports = { pushBounded, MAX_LIST_LENGTH, purgeTopLikersIfNeeded, MAX_TOP_LIKERS, TOP_LIKERS_PURGE_TARGET };
