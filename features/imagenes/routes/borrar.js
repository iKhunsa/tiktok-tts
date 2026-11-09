'use strict';

const fs = require('fs');
const path = require('path');

function borrar({ store, logger }) {
  return (req, res) => {
    const db = store.cargar(logger);
    const idx = db.items.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'no_encontrado', codigo: 'no_encontrado' });
    const [quitado] = db.items.splice(idx, 1);
    store.guardar(db);
    try { fs.unlinkSync(path.join(store.archivosDir(), quitado.archivo)); } catch (error) {
      logger.log('warn', 'imagenes', 'imagenes/routes/borrar.js#borrar', 'imagenes.borrar.archivo_fallido', `No se pudo borrar el archivo ${quitado.archivo}: ${error.message}`, { archivo: quitado.archivo, error: error.message });
    }
    res.json({ ok: true });
  };
}

module.exports = { borrar };
