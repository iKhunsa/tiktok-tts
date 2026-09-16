'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Toda descarga disparada dentro de PortalView va a la carpeta de Descargas
// real del usuario (app.getPath('downloads')) — mismo comportamiento que un
// navegador normal. Sin gestor de descargas con UI propia (fuera de alcance).
function attachDownloadHandling(sess, { onDownloadEvent, logger } = {}) {
  sess.on('will-download', (_event, item) => {
    const savePath = resolveCollision(path.join(app.getPath('downloads'), item.getFilename()));
    item.setSavePath(savePath);
    const filename = path.basename(savePath);

    onDownloadEvent?.({ phase: 'started', filename });

    item.on('done', (_e, state) => {
      if (state === 'completed') {
        onDownloadEvent?.({ phase: 'completed', filename, savePath });
      } else {
        onDownloadEvent?.({ phase: 'failed', filename });
        logger?.log(
          'warn', 'portal-view', 'portal-view/downloads.js#attachDownloadHandling', 'portalview.descarga.fallida',
          `Descarga "${filename}" termino en estado "${state}"`, { filename, state }
        );
      }
    });
  });
}

// "archivo.png" -> "archivo (1).png" -> "archivo (2).png" ... nunca pisa un
// archivo existente del usuario.
function resolveCollision(fullPath) {
  if (!fs.existsSync(fullPath)) return fullPath;
  const dir = path.dirname(fullPath);
  const ext = path.extname(fullPath);
  const base = path.basename(fullPath, ext);
  let n = 1;
  let candidate;
  do {
    candidate = path.join(dir, `${base} (${n})${ext}`);
    n++;
  } while (fs.existsSync(candidate));
  return candidate;
}

module.exports = { attachDownloadHandling };
