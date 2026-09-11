'use strict';

// Contrato con /electron-shell (Fase 12, todavia no existe). El atajo
// global Ctrl+Shift+M se registra del lado Electron (uiohook-napi o
// globalShortcut como fallback, backend-viejo/main.js:362-370). main.js y
// server.js corren en el MISMO proceso Node, asi que /electron-shell llama
// bus.emit('clips:marcar', { origen: 'atajo-teclado' }) directo en vez de
// un roundtrip via IPC + HTTP.
const GLOBAL_SHORTCUT = 'CommandOrControl+Shift+M';

module.exports = { GLOBAL_SHORTCUT };
