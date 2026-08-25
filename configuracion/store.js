'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../core/paths');
const { DEFAULT_CONFIG } = require('./default-config');
const { applyConfigPatch } = require('./apply-patch');

const CONFIG_FILE = path.join(DATA_BASE, 'config.json');
const CONFIG_TMP_FILE = `${CONFIG_FILE}.tmp`;

function createConfigStore(logger) {
  const config = { ...DEFAULT_CONFIG };

  function save() {
    try {
      fs.writeFileSync(CONFIG_TMP_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      fs.renameSync(CONFIG_TMP_FILE, CONFIG_FILE);
      logger.log(
        'info', 'configuracion', 'configuracion/store.js#save', 'configuracion.store.guardado',
        `config.json guardado en ${CONFIG_FILE}`, { path: CONFIG_FILE }
      );
    } catch (error) {
      logger.log(
        'error', 'configuracion', 'configuracion/store.js#save', 'configuracion.store.guardado_fallido',
        `No se pudo guardar config.json: ${error.message}`, { path: CONFIG_FILE, error: error.message, stack: error.stack }
      );
    }
  }

  function load() {
    try {
      if (!fs.existsSync(CONFIG_FILE)) return;
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      const { rejected } = applyConfigPatch(config, parsed);
      if (rejected.length) {
        logger.log(
          'warn', 'configuracion', 'configuracion/store.js#load', 'configuracion.store.claves_invalidas_ignoradas',
          `config.json traia ${rejected.length} clave(s) invalida(s), se ignoraron`, { rejected }
        );
      }
      // Nunca el objeto config completo (regla dura #5) — solo la cuenta de claves.
      logger.log(
        'info', 'configuracion', 'configuracion/store.js#load', 'configuracion.store.cargado',
        `config.json cargado con ${Object.keys(config).length} clave(s)`, { keysCount: Object.keys(config).length }
      );
    } catch (error) {
      logger.log(
        'warn', 'configuracion', 'configuracion/store.js#load', 'configuracion.store.carga_fallida',
        `No se pudo cargar config.json, se usa DEFAULT_CONFIG: ${error.message}`, { path: CONFIG_FILE, error: error.message }
      );
    }
  }

  return {
    config,
    save,
    load,
    applyPatch: (input) => applyConfigPatch(config, input),
  };
}

module.exports = { createConfigStore, CONFIG_FILE };
