'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

// `/S` = instalacion silenciosa de NSIS (sin el wizard propio del
// instalador — el usuario ya confirmo "Instalar ahora" DENTRO de la app).
// `--force-run` = el flag propio que agrega electron-builder para que el
// instalador asistido (oneClick:false, nuestro caso) vuelva a abrir la app
// el solo al terminar — SIN ese flag, un instalador silencioso NUNCA
// relanza nada: el "Run after finish" de NSIS esta atado al boton de la
// pagina de Finish, que en modo /S jamas se dibuja (confirmado leyendo
// installSection.nsh de app-builder-lib: `${if} isForceRun ${andIf}
// Silent` es la unica rama que relanza en un instalador asistido).
//
// No se espera a que el instalador termine: tiene que reemplazar el .exe
// que esta instalado ahi mismo, el mismo que esta app tiene abierto ahora
// — mientras sigamos vivos ese archivo queda bloqueado y el instalador no
// puede avanzar. Por eso se lanza detached+unref (como hace electron-updater
// en su propio NsisUpdater) y quien llama cierra la app enseguida despues.
function ejecutarInstalador(destino) {
  const hijo = spawn(destino, ['/S', '--force-run'], { stdio: 'ignore', detached: true });
  hijo.on('error', () => { /* best-effort: un listener vacio evita que un ENOENT tire abajo el proceso */ });
  hijo.unref();
}

module.exports = { descargarInstalador, ejecutarInstalador };
