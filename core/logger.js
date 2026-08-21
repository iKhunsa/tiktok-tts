'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CAP = 250;
const MAX_SESSION_LOG_BYTES = 480 * 1024 * 1024; // 480MB por archivo de sesion

function extractError(data) {
  if (data instanceof Error) return data;
  if (data && data.error instanceof Error) return data.error;
  return null;
}

function normalizeData(data) {
  if (data instanceof Error) return { error: data.message };
  if (data && data.error instanceof Error) return { ...data, error: data.error.message };
  return data || undefined;
}

/**
 * Unico modulo con permiso de tocar console.* directo (fallback de ultima
 * instancia cuando el stream de archivo no esta disponible).
 */
function createLogger({ logsDir, cap = DEFAULT_CAP } = {}) {
  const buffer = [];
  let bus = null;
  let stream = null;
  let sessionLogPath = null;
  let bytesWritten = 0;
  let bufferOverflowReported = false;

  if (logsDir) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      const fileName = `session-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.log`;
      sessionLogPath = path.join(logsDir, fileName);
      stream = fs.createWriteStream(sessionLogPath, { flags: 'a' });
    } catch (error) {
      stream = null;
      console.error('[core.logger] no se pudo abrir el stream de log de sesion:', error.message);
    }
  }

  function pushToBuffer(entry) {
    buffer.push(entry);
    if (buffer.length > cap) {
      buffer.shift();
      if (!bufferOverflowReported) {
        bufferOverflowReported = true;
        buffer.push({
          ts: new Date().toISOString(),
          level: 'warn',
          domain: 'core',
          function: 'core/logger.js#log',
          event: 'core.logger.buffer_lleno',
          message: `Buffer de logs en memoria alcanzo el cap de ${cap}, se empiezan a descartar entradas viejas`,
          data: { cap, descartados: 1 },
        });
      }
    }
  }

  function writeToStream(entry) {
    if (!stream || bytesWritten >= MAX_SESSION_LOG_BYTES) return;
    try {
      const line = JSON.stringify(entry) + '\n';
      stream.write(line);
      bytesWritten += Buffer.byteLength(line);
    } catch (error) {
      const failedPath = sessionLogPath;
      stream = null;
      const failEntry = {
        ts: new Date().toISOString(),
        level: 'error',
        domain: 'core',
        function: 'core/logger.js#log',
        event: 'core.logger.escritura_fallida',
        message: `No se pudo escribir al log de sesion: ${error.message}`,
        data: { path: failedPath, error: error.message },
        stack: error.stack,
      };
      pushToBuffer(failEntry);
      console.error(JSON.stringify(failEntry));
    }
  }

  function log(level, domain, fn, event, message, data) {
    const err = extractError(data);
    const stackFromData = err ? err.stack : (data && typeof data.stack === 'string' ? data.stack : undefined);
    const isErrorLevel = level === 'error' || level === 'fatal';

    const entry = {
      ts: new Date().toISOString(),
      level,
      domain,
      function: fn,
      event,
      message,
      data: normalizeData(data),
      ...(isErrorLevel && { stack: stackFromData || new Error(message).stack }),
    };

    pushToBuffer(entry);
    writeToStream(entry);

    if (bus && isErrorLevel) {
      bus.emit(event === 'core.dominio.fallo_montaje' ? 'error:uncaught' : 'error:handled', {
        domain,
        function: fn,
        event,
        message,
        stack: entry.stack,
        data: entry.data,
      });
    }

    // Espejo de TODO log al bus, no solo errores — /telemetria (Fase 12) lo
    // usa para instrumentar eventos de alta frecuencia (TTS, musica,
    // moderacion) sin que cada dominio anterior tenga que conocer telemetria.
    if (bus) bus.emit('log:entry', entry);

    // Fallback de ultima instancia: solo si el archivo de sesion no esta disponible.
    if (!stream) {
      const consoleFn = isErrorLevel ? console.error : console.log;
      consoleFn(JSON.stringify(entry));
    }
  }

  function attachBus(eventBus) {
    bus = eventBus;
  }

  function getBuffer() {
    return buffer.slice();
  }

  function getSessionLogPath() {
    return sessionLogPath;
  }

  return { log, attachBus, getBuffer, getSessionLogPath };
}

module.exports = { createLogger };
