'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Map();

function on(channel, cb) {
  const wrapped = (...args) => cb(...args);
  ipcRenderer.on(channel, wrapped);
  listeners.set(cb, { channel, wrapped });
  return () => off(channel, cb);
}

function off(channel, cb) {
  const stored = listeners.get(cb);
  if (stored) {
    ipcRenderer.removeListener(stored.channel, stored.wrapped);
    listeners.delete(cb);
  }
}

// Eventos de telemetria/analytics que nacen en el renderer. El resto vive en el
// proceso principal o en server.js y no necesita este canal.
//  - tts:skipped / tts:queue-overflow → cola TTS (sin payload).
//  - ui:language-set → cambio de idioma de UI (payload: código de idioma).
const TRACKABLE_EVENTS = new Set(['tts:skipped', 'tts:queue-overflow', 'ui:language-set']);

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  trackEvent: (name, payload) => {
    if (!TRACKABLE_EVENTS.has(name)) return;
    // Solo se reenvía payload cuando es un string corto (código de idioma).
    if (typeof payload === 'string') ipcRenderer.send('telemetry:track', name, payload.slice(0, 12));
    else ipcRenderer.send('telemetry:track', name);
  },
  onMarkClip: (cb) => on('mark-clip', () => cb()),
  offMarkClip: (cb) => off('mark-clip', cb),
  onUpdateEvent: (cb) => on('update-event', (_e, data) => cb(data)),
  offUpdateEvent: (cb) => off('update-event', cb),
  installUpdate: () => ipcRenderer.send('install-update'),
  registerTtsShortcut: (action, shortcut) => ipcRenderer.invoke('register-tts-shortcut', { action, shortcut }),
  onTtsShortcut: (cb) => on('tts-shortcut', (_e, action) => cb(action)),
  offTtsShortcut: (cb) => off('tts-shortcut', cb),
  registerSoundpadShortcut: (soundId, shortcut) => ipcRenderer.invoke('register-soundpad-shortcut', { soundId, shortcut }),
  unregisterSoundpadShortcut: (soundId) => ipcRenderer.invoke('unregister-soundpad-shortcut', soundId),
  onPlaySoundpad: (cb) => on('play-soundpad', (_e, d) => cb(d)),
  offPlaySoundpad: (cb) => off('play-soundpad', cb),
  portalView: {
    show: () => ipcRenderer.invoke('portal:show'),
    hide: () => ipcRenderer.invoke('portal:hide'),
    navigate: (tabId, input) => ipcRenderer.invoke('portal:navigate', { tabId, input }),
    newTab: (url) => ipcRenderer.invoke('portal:new-tab', { url }),
    closeTab: (tabId) => ipcRenderer.invoke('portal:close-tab', { tabId }),
    switchTab: (tabId) => ipcRenderer.invoke('portal:switch-tab', { tabId }),
    resizePanel: (widthPx) => ipcRenderer.invoke('portal:panel-resize', { widthPx }),
    setPanelWidth: (widthPx) => ipcRenderer.invoke('portal:set-panel-width', { widthPx }),
    goBack: (tabId) => ipcRenderer.invoke('portal:go-back', { tabId }),
    goForward: (tabId) => ipcRenderer.invoke('portal:go-forward', { tabId }),
    reload: (tabId) => ipcRenderer.invoke('portal:reload', { tabId }),
    addFavorite: (label, url, icon) => ipcRenderer.invoke('portal:add-favorite', { label, url, icon }),
    removeFavorite: (id) => ipcRenderer.invoke('portal:remove-favorite', { id }),
    editFavorite: (id, { label, url, icon }) => ipcRenderer.invoke('portal:edit-favorite', { id, label, url, icon }),
    closeSession: () => ipcRenderer.invoke('portal:close-session'),
    onStateChanged: (cb) => on('portal:state-changed', (_e, state) => cb(state)),
    offStateChanged: (cb) => off('portal:state-changed', cb),
    onDownloadEvent: (cb) => on('portal:download-event', (_e, data) => cb(data)),
    offDownloadEvent: (cb) => off('portal:download-event', cb),
  },
});
