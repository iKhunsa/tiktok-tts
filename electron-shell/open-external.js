'use strict';

const { shell } = require('electron');

// shell.openExternal() rechaza cuando Windows no tiene una app asociada al
// esquema/URL ("No se ha encontrado la aplicación", 0x800401F5 / 0x483). No hay
// nada que la app pueda hacer al respecto, pero sin .catch() la promesa rechazada
// sube a process.on('unhandledRejection') y se reporta como issue de GlitchTip
// (#59 / #60 / #64). Se traga el rechazo — es config del SO del usuario.
function openExternalSafe(url) {
  return shell.openExternal(url).catch(() => {});
}

module.exports = { openExternalSafe };
