'use strict';

const WebSocket = require('ws');

/** Consumido por /clips (Fase 11) via bus.emit('canal:obs:guardar-replay'). */
function saveReplay(deps) {
  const { state, logger } = deps;
  const ws = state.obs.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logger.log(
      'warn', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_fallido',
      'No se pudo guardar el replay: OBS no esta conectado', { error: 'obs-no-conectado' }
    );
    const err = new Error('OBS no conectado');
    err.statusCode = 400;
    throw err;
  }
  try {
    const requestId = `replay-${Date.now()}`;
    ws.send(JSON.stringify({ op: 6, d: { requestType: 'SaveReplayBuffer', requestId } }));
    logger.log(
      'info', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_guardado',
      'Solicitud de guardado de replay enviada a OBS', { requestId }
    );
  } catch (error) {
    logger.log(
      'error', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_fallido',
      `Fallo enviando solicitud de replay a OBS: ${error.message}`, { error: error.message, stack: error.stack }
    );
    throw error;
  }
}

module.exports = { saveReplay };
