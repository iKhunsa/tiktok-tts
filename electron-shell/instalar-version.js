'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Descarga + ejecuta un instalador real de GitHub Releases — mismo camino
// para ir hacia adelante (updater.js) o hacia atras (rollback.js). Separado
// en dos pasos porque el update hacia adelante necesita esperar la
// confirmacion del usuario ("Instalar ahora") despues de descargar; el
// rollback los encadena los dos de una. Como el instalador NSIS es
// perMachine:false, el codigo vive en %LOCALAPPDATA%\Programs\... y los
// datos de usuario en %APPDATA%\TikLiveTTS — correrlo de nuevo (subir o
// bajar de version) nunca toca esos datos.

async function descargarInstalador(app, asset, onProgress) {
  const destino = path.join(app.getPath('temp'), asset.name);
  const res = await fetch(asset.browser_download_url);
  if (!res.ok || !res.body) throw new Error(`descarga del instalador ${res.status}`);

  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  let transferido = 0;
  const out = fs.createWriteStream(destino);

  for await (const chunk of res.body) {
    out.write(chunk);
    transferido += chunk.length;
    if (onProgress) onProgress({ transferido, total, percent: total ? Math.round((transferido / total) * 100) : 0 });
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  return destino;
}

function ejecutarInstalador(destino) {
  execFile(destino, [], { detached: true }).unref();
}

module.exports = { descargarInstalador, ejecutarInstalador };
