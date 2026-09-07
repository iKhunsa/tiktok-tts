'use strict';

function deleteAllViewers(deps) {
  return (req, res) => {
    if ((req.body || {}).confirm !== true) return res.status(400).json({ error: 'confirm requerido' });
    const removed = deps.store.clearAll();
    deps.store.flush();
    deps.bus.emit('ws:broadcast', { type: 'moderation-reset' });
    deps.logger.log(
      'info', 'moderacion', 'moderacion/routes/delete-all-viewers.js#deleteAllViewers', 'moderacion.accion.registro_vaciado',
      `Registro de espectadores vaciado (${removed} eliminado(s))`, { removed }
    );
    res.json({ ok: true, removed });
  };
}

module.exports = { deleteAllViewers };
