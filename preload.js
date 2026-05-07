'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMarkClip: (cb) => ipcRenderer.on('mark-clip', () => cb()),
  openOAuthWindow: (url, callbackPattern) =>
    ipcRenderer.invoke('open-oauth-window', { url, callbackPattern }),
});
