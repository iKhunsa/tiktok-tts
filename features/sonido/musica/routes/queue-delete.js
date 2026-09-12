'use strict';

const { musicBroadcastState } = require('../broadcast-state');

function broadcastQueue(deps) {
  const queue = [...deps.musicState.queue];
  deps.bus.emit('ws:broadcast', { type: 'music-queue-updated', queue });
  musicBroadcastState(deps);
  return queue;
}

/** DELETE /api/music/queue/:index — quita una peticion ya resuelta. */
function removeQueueItem(deps) {
  return (req, res) => {
    const rawIndex = req.params && req.params.index;
    if (typeof rawIndex !== 'string' || !/^(?:0|[1-9]\d*)$/.test(rawIndex)) {
      return res.status(400).json({ error: 'Índice de cola inválido' });
    }

    const index = Number(rawIndex);
    if (!Number.isSafeInteger(index)) {
      return res.status(400).json({ error: 'Índice de cola inválido' });
    }
    if (index >= deps.musicState.queue.length) {
      return res.status(404).json({ error: 'Elemento de cola no encontrado' });
    }

    const [removed] = deps.musicState.queue.splice(index, 1);
    return res.json({ ok: true, removed, queue: broadcastQueue(deps) });
  };
}

/** DELETE /api/music/queue — vacia la cola y cancela resoluciones en vuelo. */
function clearQueue(deps) {
  return (_req, res) => {
    const removedCount = deps.musicState.queue.length;
    deps.musicState.queue.length = 0;
    // Las solicitudes !p que estan esperando yt-dlp no tienen un child que se
    // pueda cancelar de forma segura. Este contador invalida sus resultados
    // cuando vuelvan, para que "Vaciar cola" no reaparezca segundos despues.
    deps.musicState.queueGeneration = (deps.musicState.queueGeneration || 0) + 1;
    return res.json({ ok: true, removedCount, queue: broadcastQueue(deps) });
  };
}

module.exports = { removeQueueItem, clearQueue };
