'use strict';

// Acumula `amount` en el campo `field` del usuario y recuerda su ultimo avatar.
// ponytail: sin cap/purga propio — los donadores distintos por stream son pocos
// (credits.donors ya es igual de ilimitado); los likers se purgan en bounded-push.
function addTopEntry(topMap, field, { user, amount, avatar = '' }) {
  const entry = topMap.get(user) || { user, [field]: 0, avatar: '' };
  entry[field] += amount;
  entry.avatar = avatar || entry.avatar;
  topMap.set(user, entry);
}

module.exports = { addTopEntry };
