'use strict';

const fs = require('fs');
const { downloadBinary } = require('./download-binary');
const { runYtdlp } = require('./run-ytdlp');
const { detectJsRuntime } = require('./detect-js-runtime');
const { emitStatus } = require('./get-status');

function ensureReady(state) {
  if (state.status.state === 'ready') return Promise.resolve();
  if (state.readyPromise) return state.readyPromise;

  state.readyPromise = (async () => {
    try {
      if (!fs.existsSync(state.ytdlpPath)) await downloadBinary(state);
      // Primer arranque puede tardar (PyInstaller extrae a temp) -> timeout generoso
      let ver = await runYtdlp(state, ['--version'], { timeoutMs: 60000 });
      if (ver.code !== 0) {
        // Binario corrupto o incompatible -> re-descargar una vez
        try {
          fs.unlinkSync(state.ytdlpPath);
        } catch (error) {
          state.logger.log(
            'debug', 'sonido', 'sonido/musica/engine/ensure-ready.js#ensureReady', 'sonido.musica.limpieza_ignorada',
            `No se pudo borrar el binario corrupto: ${error.message}`, { path: state.ytdlpPath, error: error.message }
          );
        }
        await downloadBinary(state);
        ver = await runYtdlp(state, ['--version'], { timeoutMs: 60000 });
        if (ver.code !== 0) throw new Error(ver.stderr.trim() || `yt-dlp exit ${ver.code}`);
      }
      state.status.version = ver.stdout.trim();
      await detectJsRuntime(state);
      emitStatus(state, 'ready');
      state.logger.log(
        'info', 'sonido', 'sonido/musica/engine/ensure-ready.js#ensureReady', 'sonido.musica.motor_listo',
        `yt-dlp listo (version ${state.status.version})`, { version: state.status.version, jsRuntime: state.jsRuntimeArgs.length > 0 }
      );
    } catch (error) {
      emitStatus(state, 'error', error.message);
      state.logger.log(
        'warn', 'sonido', 'sonido/musica/engine/ensure-ready.js#ensureReady', 'sonido.musica.motor_no_disponible',
        `yt-dlp no disponible: ${error.message}`, { error: error.message, stack: error.stack }
      );
      throw error;
    } finally {
      state.readyPromise = null; // permite reintentar en el proximo request si fallo
    }
  })();
  return state.readyPromise;
}

module.exports = { ensureReady };
