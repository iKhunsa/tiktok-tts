'use strict';

const { nombreValido } = require('../nombre-valido');
const { responderError } = require('./codigos');

// Renombra un GIF y/o lo mueve a una carpeta (carpeta: null lo deja suelto).
function patch({ store, logger }) {
  return (req, res) => {
    const db = store.cargar(logger);
    const item = db.items.find((otro) => otro.id === req.params.id);
    if (!item) return responderError(res, { codigo: 'no_encontrado' });
    const { nombre, carpeta } = req.body || {};
    if (nombre !== undefined) {
      const limpio = nombreValido(nombre);
      if (!limpio) return responderError(res, { codigo: 'nombre_invalido' });
      item.nombre = limpio;
    }
    if (carpeta !== undefined) {
      if (carpeta !== null && !db.carpetas.some((otra) => otra.id === carpeta)) return responderError(res, { codigo: 'carpeta_invalida' });
      item.carpeta = carpeta;
    }
    store.guardar(db);
    res.json({ item: store.conSrc(item) });
  };
}

module.exports = { patch };
