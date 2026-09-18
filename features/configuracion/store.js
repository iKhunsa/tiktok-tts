'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE, DATA_BASE } = require('../../core/paths');
const { accountDataPath } = require('../../core/account-data-path');
const { DEFAULT_CONFIG } = require('./default-config');
const { applyConfigPatch } = require('./apply-patch');

function configFile() { return accountDataPath('config.json'); }
const INSTALLATION_KEYS = ['subscriptionsEnabled', 'mcpEnabled', 'mcpDestructiveToolsEnabled', 'mcpDevToolsEnabled'];
const INSTALLATION_FILE = path.join(DATA_BASE, 'installation-config.json');
const LEGACY_CONFIG_FILE = path.join(DATA_BASE, 'config.json');
const MIGRATION_FILE = path.join(DATA_BASE, 'account-data-migrated-v1.json');

function pick(object, keys) {
  return Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));
}

function migrateLegacyConfig() {
  const destination = configFile();
  if (fs.existsSync(MIGRATION_FILE) || !fs.existsSync(LEGACY_CONFIG_FILE) || fs.existsSync(destination)) return;
  const legacy = JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8'));
  fs.writeFileSync(destination, `${JSON.stringify(Object.fromEntries(Object.entries(legacy).filter(([key]) => !INSTALLATION_KEYS.includes(key))), null, 2)}\n`, 'utf8');
  fs.writeFileSync(MIGRATION_FILE, JSON.stringify({ config: true, migratedAt: Date.now() }), 'utf8');
}
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

  function loadInstallationConfig() {
    try {
      const source = fs.existsSync(INSTALLATION_FILE) ? INSTALLATION_FILE : LEGACY_CONFIG_FILE;
      if (!fs.existsSync(source)) return;
      applyConfigPatch(config, pick(JSON.parse(fs.readFileSync(source, 'utf8')), INSTALLATION_KEYS));
      if (source === LEGACY_CONFIG_FILE) fs.writeFileSync(INSTALLATION_FILE, `${JSON.stringify(pick(config, INSTALLATION_KEYS), null, 2)}\n`, 'utf8');
    } catch (_) { /* defaults conservadores */ }
  }

  function save() {
    try {
      const file = configFile();
      fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(Object.fromEntries(Object.entries(config).filter(([key]) => !INSTALLATION_KEYS.includes(key))), null, 2)}\n`, 'utf8');
      fs.renameSync(`${file}.tmp`, file);
      fs.writeFileSync(`${INSTALLATION_FILE}.tmp`, `${JSON.stringify(pick(config, INSTALLATION_KEYS), null, 2)}\n`, 'utf8');
      fs.renameSync(`${INSTALLATION_FILE}.tmp`, INSTALLATION_FILE);
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
      loadInstallationConfig();
      const file = configFile();
      if (require('../../core/account-data-path').getActiveAccount() !== 'anonymous') migrateLegacyConfig();
      if (!fs.existsSync(file)) return;
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const { rejected } = applyConfigPatch(config, Object.fromEntries(Object.entries(parsed).filter(([key]) => !INSTALLATION_KEYS.includes(key))));
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
