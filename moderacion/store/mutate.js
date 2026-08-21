'use strict';

const { ensure } = require('./ensure');
const { markDirty } = require('./flush');
const { toDTO } = require('./to-dto');

/** Todas las mutaciones devuelven el DTO ya expandido. */
function mutate(state, target, fn) {
  const { key, viewer } = ensure(state, target);
  fn(viewer);
  markDirty(state);
  return toDTO(state, key, viewer);
}

module.exports = { mutate };
