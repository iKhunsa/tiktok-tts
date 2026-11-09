'use strict';

const { importar: importarGif } = require('../importar');
const { responderError } = require('./codigos');

function importarRoute({ store, logger, importar = importarGif }) {
  return async (req, res) => {
    const { url, titulo, origen } = req.body || {};
    try {
      const { item, duplicado } = await importar({ url, titulo, origen }, { store, logger });
      res.json({ item: store.conSrc(item), duplicado });
    } catch (error) {
      if (!error.codigo) {
        logger.log('error', 'gifs', 'gifs/routes/importar.js#importarRoute', 'gifs.importar.fallo', `No se pudo importar un GIF: ${error.message}`, { error: error.message });
      }
      responderError(res, error);
    }
  };
}

module.exports = { importarRoute };
