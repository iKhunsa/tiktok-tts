'use strict';

const { isActive } = require('./is-active');

/**
 * Descarta los inactivos mas antiguos. Nunca toca seguidores, whitelisted ni
 * usuarios con un castigo vivo.
 */
function purge(state) {
  if (state.viewers.size <= state.maxViewers) return 0;

  const disposable = [];
  for (const [key, v] of state.viewers) {
    if (v.fol || v.wl || isActive(v.mute) || isActive(v.ban)) continue;
    disposable.push([key, v.last]);
  }

  const excess = state.viewers.size - state.purgeTarget;
  if (excess <= 0) return 0;

  if (disposable.length < excess) {
    state.logger.log(
      'warn', 'moderacion', 'moderacion/store/purge.js#purge', 'moderacion.store.limite_alcanzado',
      `Registro por encima del limite (${state.viewers.size}) y sin candidatos suficientes para purgar (${disposable.length})`,
      { viewers: state.viewers.size, disposable: disposable.length }
    );
  }

  disposable.sort((a, b) => a[1] - b[1]);
  const toRemove = disposable.slice(0, excess);
  for (const [key] of toRemove) state.viewers.delete(key);

  if (toRemove.length) {
    state.dirty = true;
    state.logger.log(
      'info', 'moderacion', 'moderacion/store/purge.js#purge', 'moderacion.store.purgado',
      `Se purgaron ${toRemove.length} viewer(s), quedan ${state.viewers.size}`,
      { removed: toRemove.length, viewers: state.viewers.size }
    );
  }

  return toRemove.length;
}

module.exports = { purge };
