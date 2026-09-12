'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');
const { TIKTOK_GIFT_COINS } = require('../gift-coins-table');
const { computeGiftUsd } = require('../compute-gift-usd');

const TEST_USERS = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];

function testGift(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const giftsDir = path.join(RESOURCE_BASE, 'gifts');
    try {
      const files = fs.readdirSync(giftsDir).filter((f) => f.endsWith('.png'));
      if (files.length === 0) return res.status(500).json({ error: 'No hay imágenes de regalos' });
      const giftKeys = Object.keys(TIKTOK_GIFT_COINS);
      const giftName = giftKeys[Math.floor(Math.random() * giftKeys.length)];
      // La tabla de precios y los nombres de los PNG no se mantienen en perfecta
      // sincronía. En una alerta de prueba priorizamos mostrar una imagen que existe,
      // incluso antes de que el overlay termine de cargar su diccionario local.
      const giftPictureUrl = `/gifts/${encodeURIComponent(files[Math.floor(Math.random() * files.length)])}`;
      const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)] + Math.floor(Math.random() * 99);
      const { usdValue } = computeGiftUsd(logger, { giftName, repeatCount: 1 });

      bus.emit('ws:broadcast', { type: 'gift', user, giftName, giftPictureUrl, repeatCount: 1, usdValue, timestamp: Date.now(), test: true, duration: 10000 });
      logger.log('info', 'overlay', 'overlay/routes/test-gift.js#testGift', 'overlay.test.disparado', 'Test gift disparado', { tipo: 'gift', payload: { user, giftName } });
      res.json({ success: true, user, giftName });
    } catch (e) {
      logger.log(
        'warn', 'overlay', 'overlay/routes/test-gift.js#testGift', 'overlay.test.fallido',
        `Test gift falló: ${e.message}`, { error: e.message }
      );
      res.status(500).json({ error: e.message });
    }
  };
}

module.exports = { testGift };
