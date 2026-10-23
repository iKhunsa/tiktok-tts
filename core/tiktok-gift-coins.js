'use strict';

const { TIKTOK_GIFT_COINS } = require('./gift-coins-table');

// 1 coin ~= 2 diamonds (lo que paga el viewer vs lo que recibe el creador).
const DIAMONDS_PER_COIN = 2;

/**
 * Total de monedas pagadas por un regalo de TikTok (combo ya resuelto:
 * repeatCount es el conteo final del combo, no cada tick). Sin mapping de
 * valor conocido ni diamondCount -> 0, nunca inventa un valor.
 */
function coinsForGift(logger, { giftName, repeatCount = 1, diamondCount = 0 } = {}) {
  const lookedUpCoins = TIKTOK_GIFT_COINS[giftName];
  let perGiftCoins = null;
  if (lookedUpCoins != null) {
    perGiftCoins = lookedUpCoins;
  } else if (diamondCount > 0) {
    perGiftCoins = diamondCount / DIAMONDS_PER_COIN;
  } else if (logger) {
    logger.log(
      'warn', 'core', 'core/tiktok-gift-coins.js#coinsForGift', 'overlay.gift.valor_desconocido',
      `Regalo sin mapping de valor conocido: ${giftName}`, { giftName }
    );
  }
  if (perGiftCoins == null || perGiftCoins <= 0) return 0;
  return perGiftCoins * repeatCount;
}

module.exports = { coinsForGift };
