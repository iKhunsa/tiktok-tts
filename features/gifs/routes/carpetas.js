'use strict';

const crypto = require('crypto');
const { nombreValido } = require('../nombre-valido');
const { responderError } = require('./codigos');

const NOMBRE_CARPETA_MAX = 40;
const repetido = (db, nombre, salvo) => db.carpetas.some((c) => c.id !== salvo && c.nombre.toLowerCase() === nombre.toLowerCase());

function carpetaCrear({ store, logger }) {
  return (req, res) => {
    const nombre = nombreValido(req.body?.nombre, NOMBRE_CARPETA_MAX);
    if (!nombre) return responderError(res, { codigo: 'nombre_invalido' });
    const db = store.cargar(logger);
    if (repetido(db, nombre)) return responderError(res, { codigo: 'nombre_repetido' });
    const carpeta = { id: crypto.randomUUID().slice(0, 8), nombre };
    db.carpetas.push(carpeta);
    store.guardar(db);
    res.json({ carpeta });
  };
}

function carpetaRenombrar({ store, logger }) {
  return (req, res) => {
    const nombre = nombreValido(req.body?.nombre, NOMBRE_CARPETA_MAX);
    if (!nombre) return responderError(res, { codigo: 'nombre_invalido' });
    const db = store.cargar(logger);
    const carpeta = db.carpetas.find((c) => c.id === req.params.id);
    if (!carpeta) return responderError(res, { codigo: 'no_encontrado' });
    if (repetido(db, nombre, carpeta.id)) return responderError(res, { codigo: 'nombre_repetido' });
    carpeta.nombre = nombre;
    store.guardar(db);
    res.json({ carpeta });
  };
}

// Borrar una carpeta no borra sus GIFs: vuelven a la biblioteca sin carpeta.
function carpetaBorrar({ store, logger }) {
  return (req, res) => {
    const db = store.cargar(logger);
    const idx = db.carpetas.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return responderError(res, { codigo: 'no_encontrado' });
    db.carpetas.splice(idx, 1);
    db.items.forEach((item) => { if (item.carpeta === req.params.id) item.carpeta = null; });
    store.guardar(db);
    res.json({ ok: true });
  };
}

module.exports = { carpetaCrear, carpetaRenombrar, carpetaBorrar };
