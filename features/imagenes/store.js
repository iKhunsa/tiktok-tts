'use strict';

const fs = require('fs');
const path = require('path');
const { accountDataPath } = require('../../core/account-data-path');
const { atomicWriteFileSync } = require('../../core/atomic-write');
const { ensureDirSync } = require('../../core/ensure-dir');

// Biblioteca de imagenes subidas por el usuario (pestana Media del editor de canvas), por cuenta:
// indice JSON + carpeta de archivos.
const indicePath = () => accountDataPath('imagenes', 'indice.json');
const archivosDir = () => accountDataPath('imagenes', 'archivos');

function cargar(logger) {
  try {
    const db = JSON.parse(fs.readFileSync(indicePath(), 'utf8'));
    return { items: Array.isArray(db.items) ? db.items : [] };
  } catch (error) {
    if (error.code === 'ENOENT') return { items: [] };
    try { fs.renameSync(indicePath(), `${indicePath()}.corrupt-${Date.now()}`); } catch (_) { /* best-effort */ }
    logger?.log('warn', 'imagenes', 'imagenes/store.js#cargar', 'imagenes.indice.corrupto', `El indice de imagenes estaba corrupto y se aparto: ${error.message}`, { error: error.message });
    return { items: [] };
  }
}

function guardar(db) {
  ensureDirSync(path.dirname(indicePath()));
  atomicWriteFileSync(indicePath(), JSON.stringify(db, null, 2));
}

const conSrc = (item) => ({ ...item, src: `/imagenes/${item.archivo}` });

module.exports = { cargar, guardar, archivosDir, conSrc };
