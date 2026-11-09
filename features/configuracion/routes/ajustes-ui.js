'use strict';

const fs = require('fs');
const path = require('path');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { ensureDirSync } = require('../../../core/ensure-dir');

// Respaldo en disco de los ajustes de la interfaz de la cuenta (overlays, escenas y capas del editor de canvas).
// El renderer los guarda en localStorage; este archivo es la copia que no se pierde si ese almacen se limpia.
// Se guarda tal cual lo manda el renderer, junto con la marca de tiempo del guardado para saber cual copia es mas nueva.
const archivo = () => accountDataPath('ajustes-ui.json');

function getAjustesUi({ logger }) {
  return (_req, res) => {
    try {
      res.json(JSON.parse(fs.readFileSync(archivo(), 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.log('warn', 'configuracion', 'configuracion/routes/ajustes-ui.js#getAjustesUi', 'configuracion.ajustes_ui.ilegible', `No se pudo leer el respaldo de ajustes: ${error.message}`, { error: error.message });
      }
      res.json({ guardado: 0, datos: null });
    }
  };
}

function putAjustesUi({ logger }) {
  return (req, res) => {
    const { guardado, datos } = req.body || {};
    if (!Number.isFinite(guardado) || !datos || typeof datos !== 'object' || Array.isArray(datos)) {
      return res.status(400).json({ error: 'ajustes_invalidos' });
    }
    try {
      ensureDirSync(path.dirname(archivo()));
      atomicWriteFileSync(archivo(), JSON.stringify({ guardado, datos }));
      return res.json({ ok: true });
    } catch (error) {
      logger.log('error', 'configuracion', 'configuracion/routes/ajustes-ui.js#putAjustesUi', 'configuracion.ajustes_ui.fallo', `No se pudo guardar el respaldo de ajustes: ${error.message}`, { error: error.message });
      return res.status(500).json({ error: 'no_se_pudo_guardar' });
    }
  };
}

module.exports = { getAjustesUi, putAjustesUi };
