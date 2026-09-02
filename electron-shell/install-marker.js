'use strict';

// Marca de instalación persistente y reusable.
//
// Extraída de glitchtip.js para que cada consumidor de analítica/errores
// (glitchtip, aptabase) tenga su propio archivo y su propio "primera vez": se
// escriben en fases distintas del arranque (glitchtip.init() corre antes que
// aptabase.init() en main.js), así que compartir el archivo no sirve —
// compartir la función sí.
//
// El archivo vive en `userData` (fuera del asar, sobrevive updates). Schema:
//   { version: string|null, primeraVez: ISO, ultimaVez: ISO }
//
// `primera` es `true` en exactamente un run de por vida del usuario (el primero
// en el que el archivo no existía). `actualizada`/`desde` detectan cambio de
// versión entre runs. Nunca lanza: se llama en el arranque.

const fs = require('fs');
const path = require('path');

function marcarInstalacion(userDataDir, appVersion, fileName) {
  const ruta = path.join(userDataDir, fileName);
  let marca = null;
  try {
    marca = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch (_) {
    // no existe o está corrupto → primera vez
  }

  const resultado = {
    primera: !marca,
    actualizada: Boolean(marca && marca.version && appVersion && marca.version !== appVersion),
    desde: (marca && marca.version) || null,
    primeraVez: (marca && marca.primeraVez) || new Date().toISOString(),
  };

  try {
    fs.writeFileSync(ruta, JSON.stringify({
      version: appVersion || null,
      primeraVez: resultado.primeraVez,
      ultimaVez: new Date().toISOString(),
    }, null, 2));
  } catch (_) {
    // best-effort — si no se puede escribir, el próximo run vuelve a tratar
    // esta ejecución como "primera"
  }

  return resultado;
}

module.exports = { marcarInstalacion };
