'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../core/paths');

const LOG_RETENTION_DAYS = 14;
const LOGS_DIR = path.join(DATA_BASE, 'logs');

/**
 * Barrido de retencion: borra sesiones viejas al arrancar. Migracion de
 * backend-viejo/server.js:143-153, cuyos catch eran completamente
 * silenciosos — regla dura #3 (ningun catch queda mudo).
 */
function sweepOldSessionLogs(logger) {
  const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let files;
  try {
    files = fs.readdirSync(LOGS_DIR);
  } catch (error) {
    logger.log(
      'warn', 'reporte-bug', 'reporte-bug/retention-sweep.js#sweepOldSessionLogs', 'reporte_bug.retencion.archivo_no_borrado',
      `No se pudo leer el directorio de logs para el barrido de retencion: ${error.message}`, { path: LOGS_DIR, error: error.message }
    );
    return;
  }

  for (const file of files) {
    if (!file.startsWith('session-') || !file.endsWith('.log')) continue;
    const filePath = path.join(LOGS_DIR, file);
    try {
      if (fs.statSync(filePath).mtimeMs < cutoff) fs.unlinkSync(filePath);
    } catch (error) {
      logger.log(
        'warn', 'reporte-bug', 'reporte-bug/retention-sweep.js#sweepOldSessionLogs', 'reporte_bug.retencion.archivo_no_borrado',
        `No se pudo evaluar o borrar el log viejo ${file}: ${error.message}`, { path: filePath, error: error.message }
      );
    }
  }
}

module.exports = { sweepOldSessionLogs };
