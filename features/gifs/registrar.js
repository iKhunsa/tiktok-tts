'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ensureDirSync } = require('../../core/ensure-dir');

/**
 * Anade un GIF ya validado (`info` viene de sniff) a la biblioteca. Con `enlace` (URL de un proveedor
 * permanente) guarda solo la referencia; sin el, copia los bytes a disco. Devuelve el item guardado.
 */
function registrar({ bytes, info, huella, nombre, enlace, origen, dominio }, { store, db }) {
  const id = crypto.randomUUID().slice(0, 12);
  const item = {
    id, nombre, modo: enlace ? 'enlace' : 'archivo', tipo: info.tipo, mime: info.mime, bytes: bytes.length, huella,
    ancho: info.ancho, alto: info.alto, carpeta: null, estado: 'ok', creado: Date.now(), verificado: Date.now(),
    origen: typeof origen === 'string' ? origen.slice(0, 2048) : undefined,
    dominio,
  };
  if (enlace) item.url = enlace;
  else {
    item.archivo = `${id}.${info.ext}`;
    ensureDirSync(store.archivosDir());
    fs.writeFileSync(path.join(store.archivosDir(), item.archivo), bytes);
  }
  db.items.unshift(item);
  store.guardar(db);
  return item;
}

module.exports = { registrar };
