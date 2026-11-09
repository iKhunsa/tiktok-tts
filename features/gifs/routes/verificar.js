'use strict';

const { verificarEnlaces } = require('../verificar-enlaces');

function verificar(deps) {
  return async (_req, res) => {
    const revisados = await verificarEnlaces(deps);
    const db = deps.store.cargar(deps.logger);
    res.json({ revisados, items: db.items.map(deps.store.conSrc) });
  };
}

module.exports = { verificar };
