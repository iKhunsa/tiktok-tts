'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../core/paths');

const PLATFORM_CONFIG_FILE = path.join(DATA_BASE, 'platform-config.json');

function createPlatformConfigStore(logger) {
  const platformConfig = { twitchClientId: '' };

  function save() {
    try {
      fs.writeFileSync(PLATFORM_CONFIG_FILE, `${JSON.stringify(platformConfig, null, 2)}\n`, 'utf8');
    } catch (error) {
      logger.log(
        'error', 'configuracion', 'configuracion/platform-config-store.js#save', 'configuracion.platform.guardado_fallido',
        `No se pudo guardar platform-config.json: ${error.message}`, { path: PLATFORM_CONFIG_FILE, error: error.message, stack: error.stack }
      );
    }
  }

  function load() {
    try {
      if (!fs.existsSync(PLATFORM_CONFIG_FILE)) return;
      const parsed = JSON.parse(fs.readFileSync(PLATFORM_CONFIG_FILE, 'utf8'));
      for (const k of Object.keys(platformConfig)) {
        if (typeof parsed?.[k] === 'string') platformConfig[k] = parsed[k];
      }
    } catch (error) {
      logger.log(
        'warn', 'configuracion', 'configuracion/platform-config-store.js#load', 'configuracion.platform.carga_fallida',
        `No se pudo cargar platform-config.json: ${error.message}`, { path: PLATFORM_CONFIG_FILE, error: error.message }
      );
    }
  }

  return { platformConfig, save, load };
}

module.exports = { createPlatformConfigStore, PLATFORM_CONFIG_FILE };
