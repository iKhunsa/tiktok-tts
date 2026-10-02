'use strict';

const TEST_CHANNEL = 'test';
const MIN_VIEWERS = 50;
const VIEWERS_SPREAD = 4950;
const TEST_DURATION_MS = 8000;

// Reusa el evento canonico canal:viewers (igual que testFollow con canal:follow):
// /overlay reacciona como ante un conteo real. A los pocos segundos el canal de
// prueba vuelve a 0 para que el numero falso no se sume al total de un directo real.
function testViewers(deps) {
  return (_req, res) => {
    const { bus, logger } = deps;
    const count = MIN_VIEWERS + Math.floor(Math.random() * VIEWERS_SPREAD);
    bus.emit('canal:viewers', { platform: 'tiktok', channel: TEST_CHANNEL, viewerCount: count });
    setTimeout(() => bus.emit('canal:viewers', { platform: 'tiktok', channel: TEST_CHANNEL, viewerCount: 0 }), TEST_DURATION_MS).unref();

    logger.log('info', 'overlay', 'overlay/routes/test-viewers.js#testViewers', 'overlay.test.disparado', 'Test viewers disparado', { tipo: 'viewers', payload: { count } });
    res.json({ success: true, count });
  };
}

module.exports = { testViewers };
