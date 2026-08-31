'use strict';

const fs = require('fs');

/**
 * Lee el archivo de log de la sesion actual (JSONL: una entrada JSON por
 * linea, escrito por core/logger.js#writeToStream) y devuelve el array de
 * entradas ya parseadas. Si el path es null (stream nunca se abrio, ver
 * core/logger.js#createLogger) o el archivo todavia no existe, devuelve [].
 * Lineas corruptas o incompletas (ultima linea a medio flushear) se
 * descartan en vez de romper la lectura completa.
 */
async function readSessionLogEntries(sessionLogPath, logger) {
  if (!sessionLogPath) return [];

  let raw;
  try {
    raw = await fs.promises.readFile(sessionLogPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    if (logger) {
      logger.log(
        'warn', 'configuracion', 'configuracion/logs/read-session-log-entries.js#readSessionLogEntries', 'configuracion.logs.sesion_lectura_fallida',
        `No se pudo leer el log de sesion: ${error.message}`, { path: sessionLogPath, error: error.message }
      );
    }
    return [];
  }

  const entries = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch (_) {
      // linea corrupta o a medio escribir; se descarta sin abortar el resto.
    }
  }
  return entries;
}

module.exports = { readSessionLogEntries };
