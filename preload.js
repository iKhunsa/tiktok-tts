'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  onMarkClip: (cb) => ipcRenderer.on('mark-clip', () => cb()),
  openOAuthWindow: (url, callbackPattern) =>
    ipcRenderer.invoke('open-oauth-window', { url, callbackPattern }),
  onUpdateEvent: (cb) => ipcRenderer.on('update-event', (_e, data) => cb(data)),
  installUpdate: () => ipcRenderer.send('install-update'),
  registerPauseShortcut: (shortcut) => ipcRenderer.send('register-pause-shortcut', shortcut),
  onPauseTts: (cb) => ipcRenderer.on('pause-tts', () => cb()),
});
