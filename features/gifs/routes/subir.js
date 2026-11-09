'use strict';

const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { MAX_BYTES } = require('../descargar');
const { nombreValido } = require('../nombre-valido');
const { registrar } = require('../registrar');
const { sniff: sniffGif } = require('../sniff');

const MAX_ARCHIVOS = 10;
const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: MAX_ARCHIVOS } }).array('archivos', MAX_ARCHIVOS);

// El usuario sube sus propios GIF, WebP/APNG animados o videos cortos (mp4/webm); con otro `sniff`, sus audios. Cada archivo se acepta o
// rechaza por separado, con las mismas comprobaciones por bytes que la importacion por URL.
function subir({ store, logger, sniff = sniffGif, aceptar = (info) => info.animado, rechazoNoAceptado = 'no_animado', nombreRespaldo = 'GIF' }) {
  return (req, res) => {
    recibir(req, res, (error) => {
      if (error) {
        const codigo = error.code === 'LIMIT_FILE_SIZE' ? 'muy_grande' : 'formato_incompatible';
        return res.status(codigo === 'muy_grande' ? 413 : 422).json({ error: codigo, codigo });
      }
      const db = store.cargar(logger);
      const items = [];
      const rechazos = [];
      let duplicados = 0;
      for (const archivo of req.files || []) {
        const info = sniff(archivo.buffer);
        if (!info) { rechazos.push('formato_incompatible'); continue; }
        if (!aceptar(info)) { rechazos.push(rechazoNoAceptado); continue; }
        const huella = crypto.createHash('sha1').update(archivo.buffer).digest('hex');
        if (db.items.some((item) => item.huella === huella)) { duplicados += 1; continue; }
        // multer entrega el nombre original como latin1: se reinterpreta en UTF-8 (tildes, ñ).
        const original = Buffer.from(archivo.originalname, 'latin1').toString('utf8');
        const nombre = nombreValido(path.basename(original, path.extname(original)).slice(0, 60)) || nombreRespaldo;
        items.push(store.conSrc(registrar({ bytes: archivo.buffer, info, huella, nombre }, { store, db })));
      }
      res.json({ items, rechazos, duplicados });
    });
  };
}

module.exports = { subir };
