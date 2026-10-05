'use strict';

const { getConfigSnapshot } = require('../../../core/config-snapshot');
const { requestedLanguages } = require('../rust-guard/build-rust-config');

// Estado que ve la UI y el agente MCP: lo que el streamer configuro + lo que el
// motor esta haciendo de verdad (el paquete nativo puede faltar sin romper nada).
function describeChatGuard({ bus, rustGuard, blockedWords, allowedWords }) {
  const config = getConfigSnapshot(bus);
  const engine = rustGuard.status();
  return {
    state: engine.state,
    enabled: config.rustGuardEnabled === true,
    mode: config.rustGuardMode,
    level: config.chatGuardLevel,
    langs: config.chatGuardLangs,
    langsAuto: config.chatGuardLangsAuto !== false,
    // Con el motor apagado o ausente se muestran los idiomas que se pedirian.
    effectiveLangs: engine.effectiveLangs && engine.effectiveLangs.length ? engine.effectiveLangs : requestedLanguages(config),
    supportedLangs: engine.supportedLangs || [],
    custom: config.chatGuardCustom,
    blockedWordsTelemetryEnabled: config.blockedWordsTelemetryDisabled !== true,
    engineVersion: engine.version,
    dictionaryVersion: engine.dictionaryVersion,
    blockedCount: blockedWords.size,
    allowedWords: [...allowedWords].sort(),
  };
}

function chatGuardStatus(deps) {
  return (_req, res) => res.json(describeChatGuard(deps));
}

module.exports = { chatGuardStatus, describeChatGuard };
