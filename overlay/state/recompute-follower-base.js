'use strict';

/** Recalcula la suma de bases por canal (eliminando residuos de canales ya desconectados) y la difunde si cambio. */
function recomputeFollowerBase(deps) {
  const { state, bus, logger } = deps;
  for (const ch of state.followerBaseByChannel.keys()) {
    if (!state.activeTiktokChannels.has(ch)) state.followerBaseByChannel.delete(ch);
  }
  let sum = 0;
  for (const count of state.followerBaseByChannel.values()) sum += count;
  if (sum !== state.baseFollowerCount) {
    state.baseFollowerCount = sum;
    bus.emit('ws:broadcast', { type: 'follower-base', count: sum });
    logger.log(
      'info', 'overlay', 'overlay/state/recompute-follower-base.js#recomputeFollowerBase', 'overlay.followers.base_recalculada',
      `Base de followers recalculada: ${sum}`, { count: sum }
    );
  }
}

module.exports = { recomputeFollowerBase };
