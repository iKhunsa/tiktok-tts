'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../../core/paths');

// Los SVG del catalogo no cambian en runtime — se cachea la lista tras el
// primer readdir.
let _cache = null;

/** Lista de nombres de iconos (sin extension) para el selector del soundpad. */
function iconsList(logger) {
  return (_req, res) => {
    if (_cache) return res.json(_cache);
    try {
      _cache = fs
        .readdirSync(path.join(RESOURCE_BASE, 'asset', 'icons'))
        .filter((f) => f.endsWith('.svg'))
        .map((f) => f.slice(0, -4));
      res.json(_cache);
    } catch (error) {
      // Degradacion suave: el modal queda vacio en vez de romper.
      if (logger) logger.log(
        'warn', 'sonido', 'sonido/soundpad/routes/icons-list.js#iconsList', 'sonido.soundpad.iconos_no_listados',
        `No se pudo listar los iconos del soundpad: ${error.message}`, { error: error.message }
      );
      res.json([]);
    }
  };
}

module.exports = { iconsList };
