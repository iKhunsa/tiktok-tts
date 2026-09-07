'use strict';

// get_state — snapshot consolidado de la app. Junta los slices que cada dominio
// registró vía mcpRegistry.registerStateProvider() + algunos pulls directos por
// el contrato síncrono del bus (config:get, platform-config:get,
// canales:tiktok-conectado). Auto-ensamblado: un campo nuevo se agrega en el
// provider de su dominio, nunca acá.

const mcpRegistry = require('../../../core/contracts/mcp-registry');

function getState({ bus }) {
  const state = mcpRegistry.collectState();

  let config = null;
  try { bus.emit('config:get', (c) => { config = c; }); } catch (_) { /* noop */ }
  if (config) {
    state.config = {
      ttsVoiceLang: config.ttsVoiceLang,
      ttsSlowSpeech: !!config.ttsSlowSpeech,
      langFilterEnabled: !!config.langFilterEnabled,
      dictFilterEnabled: !!config.dictFilterEnabled,
      rateLimitEnabled: !!config.rateLimitEnabled,
      musicEnabled: !!config.musicEnabled,
      playlistEnabled: !!config.playlistEnabled,
      ttsReadNonFollowers: !!config.ttsReadNonFollowers,
      mcpEnabled: config.mcpEnabled !== false,        // default true (ver default-config.js)
      mcpDestructiveToolsEnabled: !!config.mcpDestructiveToolsEnabled,
      // adminIdentities se omite a propósito
    };
  }

  let tiktokConnected = false;
  try { bus.emit('canales:tiktok-conectado', (v) => { tiktokConnected = !!v; }); } catch (_) { /* noop */ }
  state.tiktokConnected = tiktokConnected;

  state.timestamp = new Date().toISOString();
  return state;
}

module.exports = getState;
