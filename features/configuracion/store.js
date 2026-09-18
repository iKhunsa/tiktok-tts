'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../core/paths');
const { accountDataPath } = require('../../core/account-data-path');
const { DEFAULT_CONFIG } = require('./default-config');
const { applyConfigPatch } = require('./apply-patch');

function configFile() { return accountDataPath('config.json'); }
// Override de defaults opcional para builds de distribucion especial (ej. el
// draft de QA con subscriptionsEnabled:true para que los testers vean "Cuenta"
// sin editar config.json a mano). Mismo patron que cuentas-config.json: un
// archivo commiteado, copiado via extraResources, ausente en un build normal
// -> DEFAULT_CONFIG queda intacto. Solo pisa el default en el primer arranque,
// nunca un config.json que el usuario ya guardo.
const DEFAULTS_OVERRIDE_FILE = path.join(RESOURCE_BASE, 'config-defaults.json');

function leerOverrideDefaults() {
  // Mismo opt-out explicito que CUENTAS_URL='' (features/auth/config-servicio.js):
  // los tests aislan DATA_BASE en un tmpdir pero corren con RESOURCE_BASE en la
  // raiz real del repo, asi que sin esto recogerian este archivo bundleado.
  if (process.env.CONFIG_DEFAULTS_FILE === '') return null;
  try {
    return JSON.parse(fs.readFileSync(DEFAULTS_OVERRIDE_FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

function createConfigStore(logger) {
  const config = { ...DEFAULT_CONFIG };
  const override = leerOverrideDefaults();
  if (override) applyConfigPatch(config, override);

  function save() {
    try {
      const file = configFile();
      fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      fs.renameSync(`${file}.tmp`, file);
      logger.log(
        'info', 'configuracion', 'configuracion/store.js#save', 'configuracion.store.guardado',
        `config.json guardado en ${file}`, { path: file }
      );
    } catch (error) {
      logger.log(
        'error', 'configuracion', 'configuracion/store.js#save', 'configuracion.store.guardado_fallido',
        `No se pudo guardar config.json: ${error.message}`, { path: configFile(), error: error.message, stack: error.stack }
      );
    }
  }

  function load() {
    try {
      const file = configFile();
      if (!fs.existsSync(file)) return;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
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
        `No se pudo cargar config.json, se usa DEFAULT_CONFIG: ${error.message}`, { path: configFile(), error: error.message }
      );
    }
  }

  return {
    config,
    save,
    load,
    resetAndLoad: () => {
      Object.assign(config, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
      const override = leerOverrideDefaults();
      if (override) applyConfigPatch(config, override);
      load();
    },
    applyPatch: (input) => applyConfigPatch(config, input),
  };
}

module.exports = { createConfigStore, configFile };
