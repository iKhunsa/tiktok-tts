'use strict';

const crypto = require('crypto');
const path = require('path');
const { descargar } = require('./descargar');
const { nombreValido } = require('./nombre-valido');
const { registrar } = require('./registrar');
const { sniffAudio } = require('./sniff-audio');
const { validarUrl } = require('./validar-url');

const falla = (codigo) => Object.assign(new Error(codigo), { codigo });

// Titulo si lo hay; si no, el nombre del archivo de la URL sin extension.
function nombreDe(titulo, url) {
  const limpio = nombreValido(typeof titulo === 'string' ? titulo.slice(0, 60) : '');
  if (limpio) return limpio;
  const archivo = decodeURIComponent(path.basename(new URL(url).pathname)).replace(/\.[a-z0-9]{2,5}$/i, '');
  return (archivo || 'Sonido').slice(0, 60);
}

/**
 * Importa un efecto de sonido a la biblioteca: valida la URL, lo descarga (siempre se copia a disco: un
 * enlace de un sitio de sonidos puede caer y asi suena sin conexion), comprueba por los bytes que es audio y
 * evita duplicados por contenido. Devuelve { item, duplicado }.
 */
async function importarSonido({ url, titulo, origen }, { store, descargarFn = descargar, validar = validarUrl, logger }) {
  const normalizada = await validar(url);
  const { url: final, bytes } = await descargarFn(normalizada, { accept: 'audio/*' });
  const info = sniffAudio(bytes);
  if (!info) throw falla('formato_incompatible');
  const db = store.cargar(logger);
  const huella = crypto.createHash('sha1').update(bytes).digest('hex');
  const mismoContenido = db.items.find((item) => item.huella === huella);
  if (mismoContenido) return { item: mismoContenido, duplicado: true };
  const item = registrar({
    bytes, info, huella, nombre: nombreDe(titulo, final), origen, dominio: new URL(final).hostname.replace(/^www\./, ''),
  }, { store, db });
  return { item, duplicado: false };
}

module.exports = { importarSonido };
