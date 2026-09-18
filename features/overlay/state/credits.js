'use strict';

// Creditos agregados por usuario: un Map por lista en vez de un push por
// evento. Sin tope (los creditos finales listan a todos) pero acotado por
// usuarios distintos, no por eventos. Reinsertar mueve la clave al final,
// asi "los ultimos N" (slice(-N)) sigue significando "los mas recientes".

function bump(map, key, base, inc) {
  const prev = map.get(key);
  map.delete(key);
  const entry = prev || base;
  entry.count += inc;
  map.set(key, entry);
}

const idOf = (platform, userId, user) => `${platform || ''}:${userId || user}`;

function addDonor(credits, { platform, userId, user, giftName, count }) {
  bump(credits.donors, `${idOf(platform, userId, user)}|${giftName}`, { user, giftName, count: 0 }, count);
}

function addFollower(credits, { platform, userId, user }) {
  bump(credits.followers, idOf(platform, userId, user), { user, count: 0 }, 1);
}

function addSharer(credits, { platform, userId, user }) {
  bump(credits.sharers, idOf(platform, userId, user), { user, count: 0 }, 1);
}

// Mismo shape que el viejo array por evento: donors {user,giftName,count};
// followers/sharers {user} (+count, campo nuevo inocuo).
function creditsToJSON(credits) {
  return {
    donors: [...credits.donors.values()],
    followers: [...credits.followers.values()],
    sharers: [...credits.sharers.values()],
  };
}

function clearCredits(credits) {
  credits.donors.clear();
  credits.followers.clear();
  credits.sharers.clear();
}

module.exports = { addDonor, addFollower, addSharer, creditsToJSON, clearCredits };
