'use strict';

const { ensure } = require('./ensure');
const { markDirty } = require('./flush');

/**
 * No cuenta mensajes/regalos/likes por usuario a proposito — solo registra
 * que el espectador interactuo (para "ultima vez visto").
 */
function touch(state, { platform, userId, nick }) {
  const { viewer } = ensure(state, { platform, userId, nick });
  viewer.last = Date.now();
  if (nick) viewer.nick = String(nick);
  markDirty(state);
  return viewer;
}

module.exports = { touch };
