'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../core/paths');

/** Lista de PNGs de regalos para el mapeo nombre -> archivo del overlay. */
function giftsList() {
  return (_req, res) => {
    const giftsDir = path.join(RESOURCE_BASE, 'gifts');
    try {
      res.json(fs.readdirSync(giftsDir).filter((f) => f.endsWith('.png')));
    } catch (_) {
      res.json([]);
    }
  };
}

module.exports = { giftsList };
