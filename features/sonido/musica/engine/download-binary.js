'use strict';

const fs = require('fs');
const { emitStatus } = require('./get-status');

const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
const ASSET_BY_ARCH = { x64: 'yt-dlp.exe', arm64: 'yt-dlp_arm64.exe', ia32: 'yt-dlp_x86.exe' };

async function downloadBinary(state) {
  const asset = ASSET_BY_ARCH[process.arch] || 'yt-dlp.exe';
  const url = RELEASE_BASE + asset;
  fs.mkdirSync(state.binDir, { recursive: true });
  const tmp = `${state.ytdlpPath}.download`;
  emitStatus(state, 'downloading');
  state.logger.log(
    'info', 'sonido', 'sonido/musica/engine/download-binary.js#downloadBinary', 'sonido.musica.motor_descargando',
    `Descargando yt-dlp desde ${url}`, { url }
  );

  const ctrl = new AbortController();
  const abortTimer = setTimeout(() => ctrl.abort(), 180000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar yt-dlp`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, state.ytdlpPath);
  } finally {
    clearTimeout(abortTimer);
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (error) {
      state.logger.log(
        'debug', 'sonido', 'sonido/musica/engine/download-binary.js#downloadBinary', 'sonido.musica.limpieza_ignorada',
        `No se pudo borrar el archivo temporal de descarga: ${error.message}`, { path: tmp, error: error.message }
      );
    }
  }
}

module.exports = { downloadBinary };
