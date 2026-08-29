'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../../core/paths');

const LOGS_DIR = path.join(DATA_BASE, 'logs');

/**
 * Descarga TODAS las sesiones guardadas (dentro de la retencion de 14 dias),
 * concatenadas en orden cronologico. Streaming archivo por archivo — nunca
 * carga todo en memoria a la vez, ni bloquea el server mientras se genera.
 */
function getLogsDownloadAll(logger) {
  return async (_req, res) => {
    let files;
    try {
      files = (await fs.promises.readdir(LOGS_DIR))
        .filter((f) => f.startsWith('session-') && f.endsWith('.log'))
        .sort();
    } catch (error) {
      files = [];
      if (logger && error.code !== 'ENOENT') {
        logger.log(
          'warn', 'configuracion', 'configuracion/routes/get-logs-download-all.js#getLogsDownloadAll', 'configuracion.logs.lectura_dir_fallida',
          `No se pudo listar el directorio de logs: ${error.message}`, { path: LOGS_DIR, error: error.message }
        );
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tiktok-tts-logs-${new Date().toISOString().slice(0, 10)}.log"`);

    if (!files.length) {
      res.end('');
      return;
    }

    for (const file of files) {
      await new Promise((resolve) => {
        const stream = fs.createReadStream(path.join(LOGS_DIR, file));
        stream.on('error', resolve);
        stream.on('end', resolve);
        stream.pipe(res, { end: false });
      });
    }
    res.end();
  };
}

module.exports = { getLogsDownloadAll };
