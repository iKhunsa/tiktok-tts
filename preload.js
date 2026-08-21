// PLACEHOLDER TEMPORAL — reemplazado fase a fase, ver /plan-fases
'use strict';
const { contextBridge } = require('electron');

// Misma superficie que el preload original (backend-viejo/preload.js), todo no-op:
// evita que public/*.html reviente al invocar métodos que ya no existen mientras
// no hay proceso principal real detrás.
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => Promise.resolve(''),
  trackEvent: () => {},
  onMarkClip: () => () => {},
  offMarkClip: () => {},
  onUpdateEvent: () => () => {},
  offUpdateEvent: () => {},
  installUpdate: () => {},
  registerTtsShortcut: () => Promise.resolve(false),
  onTtsShortcut: () => () => {},
  offTtsShortcut: () => {},
  registerSoundpadShortcut: () => Promise.resolve(false),
  unregisterSoundpadShortcut: () => Promise.resolve(false),
  onPlaySoundpad: () => () => {},
  offPlaySoundpad: () => {},
});
