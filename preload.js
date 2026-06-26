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

function once(channel, cb) {
  const wrapped = (...args) => {
    off(channel, cb);
    cb(...args);
  };
  ipcRenderer.once(channel, wrapped);
  listeners.set(cb, { channel, wrapped });
  return () => off(channel, cb);
}

contextBridge.exposeInMainWorld('electronAPI', {
  onMarkClip: (cb) => on('mark-clip', () => cb()),
  offMarkClip: (cb) => off('mark-clip', cb),
  openOAuthWindow: (url, callbackPattern) =>
    ipcRenderer.invoke('open-oauth-window', { url, callbackPattern }),
  onUpdateEvent: (cb) => on('update-event', (_e, data) => cb(data)),
  offUpdateEvent: (cb) => off('update-event', cb),
  installUpdate: () => ipcRenderer.send('install-update'),
  registerPauseShortcut: (shortcut) => ipcRenderer.invoke('register-pause-shortcut', shortcut),
  onPauseTts: (cb) => on('pause-tts', () => cb()),
  offPauseTts: (cb) => off('pause-tts', cb),
  registerSoundpadShortcut: (soundId, shortcut) => ipcRenderer.invoke('register-soundpad-shortcut', { soundId, shortcut }),
  unregisterSoundpadShortcut: (soundId) => ipcRenderer.invoke('unregister-soundpad-shortcut', soundId),
  onPlaySoundpad: (cb) => on('play-soundpad', (_e, d) => cb(d)),
  offPlaySoundpad: (cb) => off('play-soundpad', cb),
});
