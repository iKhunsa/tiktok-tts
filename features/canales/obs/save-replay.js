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
    return Promise.reject(err);
  }

  if (!state.obs.pendingRequests) state.obs.pendingRequests = new Map();
  const requestId = `replay-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      state.obs.pendingRequests.delete(requestId);
      reject(new Error('OBS no confirmo el guardado del replay a tiempo'));
    }, 5000);

    state.obs.pendingRequests.set(requestId, {
      resolve: () => {
        clearTimeout(timeoutId);
        logger.log(
          'info', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_guardado',
          'OBS confirmo el guardado del replay', { requestId }
        );
        resolve();
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        logger.log(
          'error', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_fallido',
          `OBS no confirmo el guardado del replay: ${error.message}`, { requestId, error: error.message }
        );
        reject(error);
      },
    });

    try {
      ws.send(JSON.stringify({ op: 6, d: { requestType: 'SaveReplayBuffer', requestId } }));
    } catch (error) {
      state.obs.pendingRequests.delete(requestId);
      clearTimeout(timeoutId);
      logger.log(
        'error', 'canales', 'canales/obs/save-replay.js#saveReplay', 'canales.obs.replay_fallido',
        `Fallo enviando solicitud de replay a OBS: ${error.message}`, { error: error.message, stack: error.stack }
      );
      reject(error);
    }
  });
}

module.exports = { saveReplay };
