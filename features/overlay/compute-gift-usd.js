'use strict';

const { TIKTOK_GIFT_COINS } = require('./gift-coins-table');

const TIKTOK_COINS_USD = 0.0103; // 100 coins = $1.03 USD. Estimacion; el precio real varia por region/paquete.
// Modelo de unidades: coins = lo que paga el viewer; diamonds = lo que recibe
// el creador. En TikTok 1 coin ~= 2 diamonds -> coins = diamonds / DIAMONDS_PER_COIN.
const DIAMONDS_PER_COIN = 2;

/** Unica fuente de verdad para valorar regalos en USD. Migracion exacta de computeGiftUsd. */
function computeGiftUsd(logger, { giftName, repeatCount = 1, diamondCount = 0 } = {}) {
  const lookedUpCoins = TIKTOK_GIFT_COINS[giftName];
  let perGiftCoins = null;
  if (lookedUpCoins != null) {
    perGiftCoins = lookedUpCoins;
  } else if (diamondCount > 0) {
    perGiftCoins = diamondCount / DIAMONDS_PER_COIN;
  } else if (logger) {
    logger.log(
      'warn', 'overlay', 'overlay/compute-gift-usd.js#computeGiftUsd', 'overlay.gift.valor_desconocido',
      `Regalo sin mapping de valor conocido: ${giftName}`, { giftName }
    );
  }

  // Sin datos: no inventar un valor.
  if (perGiftCoins == null || perGiftCoins <= 0) return { totalCoins: 0, usdValue: null };
  const totalCoins = perGiftCoins * repeatCount;
  const usdRaw = totalCoins * TIKTOK_COINS_USD;
  return { totalCoins, usdValue: usdRaw > 0 ? usdRaw.toFixed(2) : null };
}

module.exports = { computeGiftUsd };
