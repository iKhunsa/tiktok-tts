'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ensureDirSync } = require('../../../core/ensure-dir');
const { tipoImagen } = require('../sniff');
const { nombreValido } = require('../nombre-valido');

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVOS = 10;
const MAX_BIBLIOTECA = 200;
const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: MAX_ARCHIVOS } }).array('imagenes', MAX_ARCHIVOS);

// Cada archivo se acepta o se rechaza por separado: la respuesta lleva los guardados y el codigo de cada rechazo.
function subir({ store, logger }) {
  return (req, res) => {
    recibir(req, res, (error) => {
      if (error) {
        const codigo = error.code === 'LIMIT_FILE_SIZE' ? 'muy_grande' : 'formato_invalido';
        return res.status(codigo === 'muy_grande' ? 413 : 400).json({ error: codigo, codigo });
      }
      const db = store.cargar(logger);
      const guardados = [];
      const rechazos = [];
      ensureDirSync(store.archivosDir());
      for (const archivo of req.files || []) {
        const tipo = tipoImagen(archivo.buffer);
        if (!tipo) { rechazos.push('formato_invalido'); continue; }
        if (db.items.length >= MAX_BIBLIOTECA) { rechazos.push('biblioteca_llena'); continue; }
        const id = crypto.randomUUID().slice(0, 12);
        const nombreArchivo = `${id}.${tipo.ext}`;
        fs.writeFileSync(path.join(store.archivosDir(), nombreArchivo), archivo.buffer);
        // multer entrega el nombre original como latin1: se reinterpreta en UTF-8 (tildes, ñ).
        const original = Buffer.from(archivo.originalname, 'latin1').toString('utf8');
        const item = { id, nombre: nombreValido(path.basename(original, path.extname(original))) || nombreArchivo, archivo: nombreArchivo, mime: tipo.mime, bytes: archivo.size, creado: Date.now() };
        db.items.push(item);
        guardados.push(store.conSrc(item));
      }
      if (guardados.length) store.guardar(db);
      res.json({ items: guardados, rechazos });
    });
  };
}

module.exports = { subir };
