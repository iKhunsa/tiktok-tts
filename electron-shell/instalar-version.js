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

// `signal` es opcional: quien llama puede cancelar una descarga en curso
// (boton "Cancelar" durante la descarga). Al abortar, se borra el archivo
// parcial para no dejar basura en la carpeta temp.
async function descargarInstalador(app, asset, onProgress, signal) {
  const destino = path.join(app.getPath('temp'), asset.name);
  const res = await fetch(asset.browser_download_url, { signal });
  if (!res.ok || !res.body) throw new Error(`descarga del instalador ${res.status}`);

  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  let transferido = 0;
  const out = fs.createWriteStream(destino);

  try {
    for await (const chunk of res.body) {
      out.write(chunk);
      transferido += chunk.length;
      if (onProgress) onProgress({ transferido, total, percent: total ? Math.round((transferido / total) * 100) : 0 });
    }
  } catch (err) {
    out.destroy();
    try { fs.unlinkSync(destino); } catch (_) { /* no se pudo descargar nada igual */ }
    throw err;
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  return destino;
}

// `/S` = instalacion silenciosa de NSIS: sin el wizard propio del
// instalador (esa ventana aparte confundia — el usuario ya confirmo
// "Instalar ahora" DENTRO de la app, no hace falta otro dialogo). Devuelve
// una promesa que resuelve cuando el instalador termino de verdad, para que
// quien llama pueda esperar antes de reiniciar la app -- antes se llamaba
// `app.quit()` al toque de lanzar el instalador (detached + unref), lo que
// cerraba la app mientras el instalador recien estaba arrancando.
function ejecutarInstalador(destino) {
  return new Promise((resolve, reject) => {
    execFile(destino, ['/S'], (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { descargarInstalador, ejecutarInstalador };
