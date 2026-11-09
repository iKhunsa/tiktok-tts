'use strict';

const { nombreValido } = require('../nombre-valido');

function patch({ store, logger }) {
  return (req, res) => {
    const db = store.cargar(logger);
    const item = db.items.find((otro) => otro.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'no_encontrado', codigo: 'no_encontrado' });
    const nombre = nombreValido(req.body?.nombre);
    if (!nombre) return res.status(400).json({ error: 'nombre_invalido', codigo: 'nombre_invalido' });
    item.nombre = nombre;
    store.guardar(db);
    res.json({ item: store.conSrc(item) });
  };
}

module.exports = { patch };
