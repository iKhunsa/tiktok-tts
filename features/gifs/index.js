'use strict';

const express = require('express');
const gifs = require('./store');
const { crearStore } = require('./store');
const { ensureDirSync } = require('../../core/ensure-dir');
const { list } = require('./routes/list');
const { importarRoute } = require('./routes/importar');
const { subir } = require('./routes/subir');
const { borrar } = require('./routes/borrar');
const { patch } = require('./routes/patch');
const { verificar } = require('./routes/verificar');
const { carpetaCrear, carpetaRenombrar, carpetaBorrar } = require('./routes/carpetas');
const { sniffAudio } = require('./sniff-audio');
const { importarSonido } = require('./importar-sonido');

const sonidos = crearStore('sonidos', '/sonidos/');
const OPCIONES_SONIDOS = { importar: importarSonido, sniff: sniffAudio, aceptar: () => true, nombreRespaldo: 'Sonido' };

// Bibliotecas personales por cuenta del editor de canvas, traidas desde su navegador embebido: "Mis GIFs"
// (/api/gifs) y "Mis sonidos" (/api/sonidos). Mismas rutas y mismo almacen, cambian el tipo de archivo que
// aceptan. Los GIF de proveedores permanentes (GIPHY, Tenor, Imgur) guardan solo el enlace; el resto se copia a disco.
function registrarBiblioteca(app, { ruta, estatica, store, logger, opciones = {}, conVerificar }) {
  // La carpeta depende de la cuenta activa: se resuelve en cada peticion.
  app.use(estatica, (req, res, next) => {
    ensureDirSync(store.archivosDir());
    return express.static(store.archivosDir())(req, res, next);
  });
  const deps = { store, logger };
  app.get(ruta, list(deps));
  app.post(`${ruta}/importar`, importarRoute({ ...deps, importar: opciones.importar }));
  app.post(`${ruta}/subir`, subir({ ...deps, ...opciones }));
  if (conVerificar) app.post(`${ruta}/verificar`, verificar(deps));
  app.post(`${ruta}/carpetas`, carpetaCrear(deps));
  app.patch(`${ruta}/carpetas/:id`, carpetaRenombrar(deps));
  app.delete(`${ruta}/carpetas/:id`, carpetaBorrar(deps));
  app.patch(`${ruta}/:id`, patch(deps));
  app.delete(`${ruta}/:id`, borrar(deps));
}

module.exports = {
  name: 'gifs',

  register({ app, logger }) {
    registrarBiblioteca(app, { ruta: '/api/gifs', estatica: '/gifs', store: gifs, logger, conVerificar: true });
    registrarBiblioteca(app, { ruta: '/api/sonidos', estatica: '/sonidos', store: sonidos, logger, opciones: OPCIONES_SONIDOS });
    return { rutas: 19, listeners: 0 };
  },
};
