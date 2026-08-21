'use strict';

const QRCode = require('qrcode');
const { getLocalIP } = require('../local-ip');

function qr(deps, port) {
  return async (_req, res) => {
    const { logger } = deps;
    const ip = getLocalIP();
    const url = `http://${ip}:${port || 3000}/mobile`;
    try {
      const png = await QRCode.toBuffer(url, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'no-store');
      res.send(png);
      logger.log('debug', 'movil', 'movil/routes/qr.js#qr', 'movil.qr.generado', 'QR del panel movil generado', { ip });
    } catch (error) {
      logger.log(
        'error', 'movil', 'movil/routes/qr.js#qr', 'movil.qr.generacion_fallida',
        `Fallo generando el QR del panel movil: ${error.message}`, { ip, error: error.message, stack: error.stack }
      );
      res.status(500).json({ error: 'QR generation failed' });
    }
  };
}

module.exports = { qr };
