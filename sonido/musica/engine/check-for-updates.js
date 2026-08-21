'use strict';

const fs = require('fs');
const { runYtdlp } = require('./run-ytdlp');

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function checkForUpdates(state) {
  if (state.status.state !== 'ready') return;
  try {
    const st = fs.statSync(state.updateMarker);
    if (Date.now() - st.mtimeMs < UPDATE_INTERVAL_MS) return;
  } catch (_) { /* sin marker -> chequear */ }
  if (state.liveChildren.size > 0) return; // nunca autoactualizar con streams activos

  try {
    fs.writeFileSync(state.updateMarker, new Date().toISOString());
  } catch (error) {
    state.logger.log(
      'debug', 'sonido', 'sonido/musica/engine/check-for-updates.js#checkForUpdates', 'sonido.musica.limpieza_ignorada',
      `No se pudo escribir el marker de actualizacion: ${error.message}`, { path: state.updateMarker, error: error.message }
    );
  }

  const out = await runYtdlp(state, ['-U'], { timeoutMs: 120000 });
  const summary = (out.stdout || out.stderr || '').trim().split('\n').pop() || '';
  state.logger.log(
    'info', 'sonido', 'sonido/musica/engine/check-for-updates.js#checkForUpdates', 'sonido.musica.chequeo_actualizacion',
    `Chequeo de actualizacion de yt-dlp: ${summary}`, { code: out.code, result: summary }
  );
  if (out.code === 0) {
    const ver = await runYtdlp(state, ['--version'], { timeoutMs: 60000 });
    if (ver.code === 0) state.status.version = ver.stdout.trim();
  }
}

module.exports = { checkForUpdates, UPDATE_INTERVAL_MS };
