'use strict';

const { coinsForGift } = require('../../core/tiktok-gift-coins');

const TIKTOK_COINS_USD = 0.0103; // 100 coins = $1.03 USD. Estimacion; el precio real varia por region/paquete.

/** Unica fuente de verdad para valorar regalos en USD. Migracion exacta de computeGiftUsd. */
function computeGiftUsd(logger, { giftName, repeatCount = 1, diamondCount = 0 } = {}) {
  const totalCoins = coinsForGift(logger, { giftName, repeatCount, diamondCount });
  if (totalCoins <= 0) return { totalCoins: 0, usdValue: null };
  const usdRaw = totalCoins * TIKTOK_COINS_USD;
  return { totalCoins, usdValue: usdRaw > 0 ? usdRaw.toFixed(2) : null };
}

module.exports = { computeGiftUsd };
