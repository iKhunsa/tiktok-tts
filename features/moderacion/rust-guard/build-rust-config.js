'use strict';

const { getConfigSnapshot } = require('../../../core/config-snapshot');

const MODES = ['shadow', 'enforce'];
const DEFAULT_MODE = 'shadow';

// El motor activa todos los locales cuando `languages` se omite (decision del
// duenio), por eso engineConfig no lo trae.
function buildRustConfig({ bus, blockedWords }) {
  const config = getConfigSnapshot(bus);
  return {
    enabled: config.rustGuardEnabled === true,
    mode: MODES.includes(config.rustGuardMode) ? config.rustGuardMode : DEFAULT_MODE,
    engineConfig: {},
    blockedWords: [...blockedWords],
  };
}

module.exports = { buildRustConfig, DEFAULT_MODE };
