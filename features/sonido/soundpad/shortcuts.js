'use strict';

/**
 * Contrato de IPC con /electron-shell (Fase 12, todavia no existe). Migracion
 * de ipcMain.handle('register-soundpad-shortcut'/'unregister-soundpad-shortcut')
 * (backend-viejo/main.js:592/633) — la implementacion del lado Electron llega
 * en la Fase 12; aca se define el contrato de eventos que va a usar:
 *
 * - bus.emit('sonido:soundpad-shortcut-registrar', { soundId, shortcut })
 *   /electron-shell escucha esto y registra el atajo global. Responde
 *   registrando el resultado via bus.emit('sonido:soundpad-shortcut-registrado', { soundId, ok }).
 * - bus.emit('sonido:soundpad-shortcut-desregistrar', { soundId })
 * - bus.on('sonido:soundpad-reproducir', ({ soundId }) => ...) — /electron-shell
 *   emite esto cuando el atajo global se presiona; /sonido (este archivo)
 *   reenvia bus.emit('ws:broadcast', { type: 'play-soundpad', soundId }).
 */
function attachSoundpadShortcuts(deps) {
  const { bus } = deps;
  bus.on('sonido:soundpad-reproducir', (payload) => {
    if (!payload || !payload.soundId) return;
    bus.emit('ws:broadcast', { type: 'play-soundpad', soundId: payload.soundId });
  }, 'sonido');
}

function registerSoundpadShortcut(bus, soundId, shortcut) {
  bus.emit('sonido:soundpad-shortcut-registrar', { soundId, shortcut });
}

function unregisterSoundpadShortcut(bus, soundId) {
  bus.emit('sonido:soundpad-shortcut-desregistrar', { soundId });
}

module.exports = { attachSoundpadShortcuts, registerSoundpadShortcut, unregisterSoundpadShortcut };
