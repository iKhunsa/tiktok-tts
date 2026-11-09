'use strict';

const fs = require('fs');
const path = require('path');
const { accountDataPath } = require('../../core/account-data-path');
const { atomicWriteFileSync } = require('../../core/atomic-write');
const { ensureDirSync } = require('../../core/ensure-dir');

const vacio = () => ({ items: [], carpetas: [] });

/**
 * Biblioteca de la cuenta activa ("Mis GIFs" y "Mis sonidos", una por `carpeta`): indice JSON + carpeta de
 * archivos (solo los descargados; los de proveedores con enlace permanente guardan nada mas la referencia).
 * `prefijoSrc` es la ruta estatica desde la que se sirven sus archivos.
 */
function crearStore(carpeta, prefijoSrc) {
  const indicePath = () => accountDataPath(carpeta, 'indice.json');
  const archivosDir = () => accountDataPath(carpeta, 'archivos');

  function cargar(logger) {
    try {
      const db = JSON.parse(fs.readFileSync(indicePath(), 'utf8'));
      return { items: Array.isArray(db.items) ? db.items : [], carpetas: Array.isArray(db.carpetas) ? db.carpetas : [] };
    } catch (error) {
      if (error.code === 'ENOENT') return vacio();
      try { fs.renameSync(indicePath(), `${indicePath()}.corrupt-${Date.now()}`); } catch (_) { /* best-effort */ }
      logger?.log('warn', 'gifs', 'gifs/store.js#cargar', 'gifs.indice.corrupto', `El indice de ${carpeta} estaba corrupto y se aparto: ${error.message}`, { error: error.message });
      return vacio();
    }
  }

  function guardar(db) {
    ensureDirSync(path.dirname(indicePath()));
    atomicWriteFileSync(indicePath(), JSON.stringify(db, null, 2));
  }

  /** Lo que ve el cliente: la URL desde la que se muestra (el enlace original o el archivo local). */
  const conSrc = (item) => ({ ...item, src: item.modo === 'enlace' ? item.url : `${prefijoSrc}${item.archivo}` });

  return { cargar, guardar, archivosDir, conSrc };
}

module.exports = { ...crearStore('gifs', '/gifs/'), crearStore };
