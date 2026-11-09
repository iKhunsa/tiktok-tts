'use strict';

const crypto = require('crypto');
const path = require('path');
const { descargar } = require('./descargar');
const { esEnlacePersistente } = require('./proveedores');
const { sniff } = require('./sniff');
const { validarUrl } = require('./validar-url');
const { registrar } = require('./registrar');

const NOMBRE_MAX = 60;

const falla = (codigo) => Object.assign(new Error(codigo), { codigo });

// Titulo de la pagina si lo hay; si no, el nombre del archivo de la URL sin extension.
function nombreDe(titulo, url) {
  const limpio = typeof titulo === 'string' ? titulo.replace(/\s+/g, ' ').trim() : '';
  if (limpio) return limpio.slice(0, NOMBRE_MAX);
  const archivo = decodeURIComponent(path.basename(new URL(url).pathname)).replace(/\.[a-z0-9]{2,5}$/i, '');
  return (archivo || 'GIF').slice(0, NOMBRE_MAX);
}

/**
 * Importa un GIF a la biblioteca: valida la URL, lo descarga (siempre, para comprobar que es de verdad
 * animado), evita duplicados por contenido y guarda solo la referencia si el proveedor es permanente, o el
 * archivo si no. Devuelve { item, duplicado }.
 */
async function importar({ url, titulo, origen }, { store, descargarFn = descargar, validar = validarUrl, logger }) {
  const normalizada = await validar(url);
  const db = store.cargar(logger);
  const repetido = db.items.find((item) => item.modo === 'enlace' && item.url === normalizada);
  if (repetido) return { item: repetido, duplicado: true };

  const { url: final, bytes } = await descargarFn(normalizada);
  const info = sniff(bytes);
  if (!info) throw falla('formato_incompatible');
  if (!info.animado) throw falla('no_animado');

  const huella = crypto.createHash('sha1').update(bytes).digest('hex');
  const mismoContenido = db.items.find((item) => item.huella === huella);
  if (mismoContenido) return { item: mismoContenido, duplicado: true };

  const item = registrar({
    bytes, info, huella, nombre: nombreDe(titulo, final), origen, dominio: new URL(final).hostname.replace(/^www\./, ''),
    enlace: esEnlacePersistente(final) ? final : null,
  }, { store, db });
  return { item, duplicado: false };
}

module.exports = { importar };
