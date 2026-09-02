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
});
