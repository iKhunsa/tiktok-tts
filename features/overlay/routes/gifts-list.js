'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');

/** Lista de PNGs de regalos para el mapeo nombre -> archivo del overlay. */
function giftsList(logger) {
  return (_req, res) => {
    const giftsDir = path.join(RESOURCE_BASE, 'gifts');
    try {
      res.json(fs.readdirSync(giftsDir).filter((f) => f.endsWith('.png')));
    } catch (error) {
      if (logger) logger.log(
        'warn', 'overlay', 'overlay/routes/gifts-list.js#giftsList', 'overlay.regalos_no_listados',
        `No se pudo listar los PNGs de regalos: ${error.message}`, { path: giftsDir, error: error.message }
      );
      res.json([]);
    }
  };
}

module.exports = { giftsList };
