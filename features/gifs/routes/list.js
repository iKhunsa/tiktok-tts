'use strict';

function list({ store, logger }) {
  return (_req, res) => {
    const db = store.cargar(logger);
    res.json({ items: db.items.map(store.conSrc), carpetas: db.carpetas });
  };
}

module.exports = { list };
