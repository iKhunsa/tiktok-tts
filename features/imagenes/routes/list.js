'use strict';

function list({ store, logger }) {
  return (_req, res) => res.json({ items: store.cargar(logger).items.map(store.conSrc) });
}

module.exports = { list };
