'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Cache en disco de lo que baja yt-dlp, una carpeta por tipo. El audio es lo
 * que suena; el video (mudo, 480p) solo lo pide el overlay que lo muestra en
 * lugar de la portada, y pesa mucho mas: por eso guarda menos.
 */
const MEDIOS = {
  audio: {
    carpeta: '',
    formato: 'bestaudio[ext=webm]/bestaudio/best',
    tipos: { '.webm': 'audio/webm', '.m4a': 'audio/mp4', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg' },
    max: 40,
  },
  video: {
    carpeta: 'video',
    // VP9 primero: AV1 (lo que YouTube da por defecto) no lo decodifica la fuente de navegador de OBS.
    formato: 'bv*[height<=480][vcodec^=vp9]/bv*[height<=480][vcodec^=avc1]/bv*[height<=480][vcodec!^=av01]/b[height<=480]',
    tipos: { '.mp4': 'video/mp4', '.webm': 'video/webm' },
    max: 15,
  },
};

const cacheDir = (state, medio) => path.join(state.dataDir, 'music-cache', MEDIOS[medio].carpeta);

/** Archivo ya descargado ({ ruta, tipo }) o null. Los .part son descargas a medias. */
function cachedMedia(state, medio, videoId) {
  const { tipos } = MEDIOS[medio];
  let archivos;
  try { archivos = fs.readdirSync(cacheDir(state, medio)); } catch (_) { return null; }
  const nombre = archivos.find((a) => a.startsWith(`${videoId}.`) && tipos[path.extname(a)]);
  return nombre ? { ruta: path.join(cacheDir(state, medio), nombre), tipo: tipos[path.extname(nombre)] } : null;
}

// Borra los archivos mas viejos cuando la carpeta pasa del tope (las subcarpetas no cuentan).
function pruneCache(state, medio) {
  const dir = cacheDir(state, medio);
  try {
    const archivos = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entrada) => entrada.isFile())
      .map(({ name }) => ({ ruta: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    archivos.slice(MEDIOS[medio].max).forEach(({ ruta }) => fs.rmSync(ruta, { force: true }));
  } catch (_) { /* cache opcional: sin poda no se rompe nada */ }
}

module.exports = { MEDIOS, cacheDir, cachedMedia, pruneCache };
