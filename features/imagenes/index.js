'use strict';

const express = require('express');
const store = require('./store');
const { ensureDirSync } = require('../../core/ensure-dir');
const { list } = require('./routes/list');
const { subir } = require('./routes/subir');
const { patch } = require('./routes/patch');
const { borrar } = require('./routes/borrar');

// Biblioteca de imagenes del usuario (pestana Media del editor de canvas), por cuenta.
module.exports = {
  name: 'imagenes',

  register({ app, logger }) {
    // La carpeta depende de la cuenta activa: se resuelve en cada peticion.
    app.use('/imagenes', (req, res, next) => {
      ensureDirSync(store.archivosDir());
      return express.static(store.archivosDir())(req, res, next);
    });

    const deps = { store, logger };
    app.get('/api/imagenes', list(deps));
    app.post('/api/imagenes', subir(deps));
    app.patch('/api/imagenes/:id', patch(deps));
    app.delete('/api/imagenes/:id', borrar(deps));
    return { rutas: 4, listeners: 0 };
  },
};
