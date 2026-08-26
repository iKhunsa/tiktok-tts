'use strict';

const { ipcMain } = require('electron');
const { registerUiohookShortcut, unregisterUiohookShortcut, isUiohookActive } = require('./uiohook');

const FORBIDDEN_SHORTCUTS = new Set(['Alt+F4', 'Ctrl+C', 'Cmd+C', 'Ctrl+V', 'Cmd+V', 'Ctrl+Alt+Del', 'Ctrl+Shift+Esc', 'Cmd+Shift+Esc']);
const SPECIAL_PAUSE_SHORTCUTS = new Set(['MediaPlayPause', 'F8', 'F9', 'F10', 'F11', 'F12']);
const TTS_SHORTCUT_ACTIONS = new Set(['pause', 'skip', 'clear', 'musicPause', 'musicSkip']);
// Lista blanca por seguridad: el renderer no puede mandar cualquier nombre
// de evento al bus.
const RENDERER_TELEMETRY_EVENTS = new Set(['tts:skipped', 'tts:queue-overflow']);

function normalizeShortcut(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') return '';
  return shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'control') return 'Ctrl';
      if (lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'CommandOrControl';
      if (lower === 'cmd' || lower === 'command') return 'Cmd';
      if (lower === 'option') return 'Alt';
      if (lower === 'arrowup') return 'Up';
      if (lower === 'arrowdown') return 'Down';
      if (lower === 'arrowleft') return 'Left';
      if (lower === 'arrowright') return 'Right';
      if (lower === 'mediaplaypause') return 'MediaPlayPause';
      if (/^f\d{1,2}$/i.test(part)) return part.toUpperCase();
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join('+');
}

function isValidShortcut(shortcut) {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized || normalized.length > 50) return false;
  if (FORBIDDEN_SHORTCUTS.has(normalized)) return false;
  if (SPECIAL_PAUSE_SHORTCUTS.has(normalized)) return true;
  return /^(Ctrl|CommandOrControl|Cmd|Alt|Shift|Super)\+([A-Z0-9]|F\d{1,2})(\+([A-Z0-9]|F\d{1,2}))*$/i.test(normalized);
}

/**
 * Conecta de punta a punta los contratos de IPC dejados pendientes en las
 * Fases 9 (soundpad) y 11 (clips), mas los atajos de TTS y el puente de
 * telemetria del renderer.
 */
function attachIpcBridge({ app, bus, logger, getMainWindow, globalShortcut }) {
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.on('install-update', () => {
    require('./updater').installUpdate();
  });

  ipcMain.on('telemetry:track', (_event, name) => {
    if (RENDERER_TELEMETRY_EVENTS.has(name)) bus.emit(name);
  });

  // Puente Kick: la ventana oculta (kick-capture-window.js) manda por acá lo
  // que su preload raspa del DOM de corard.tv. Mismo patron que telemetry:track.
  // Emite un evento propio (no canal:mensaje-crudo directo) para que
  // canales/kick/connect-kick.js pueda dedupear/watchdog ANTES de que
  // /chat vea el mensaje.
  ipcMain.on('kick:mensaje-crudo', (_event, { slug, payload }) => {
    bus.emit('canales:kick:ventana-mensaje', { slug, payload });
  });
  ipcMain.on('kick:estado', (_event, { slug, state }) => {
    bus.emit('canales:kick:ventana-estado', { slug, state });
  });

  // ── TTS shortcuts (pause / skip / clear) ────────────────────────────────
  const ttsShortcuts = new Map(); // action -> normalizedShortcut

  function unregisterTtsShortcut(action) {
    const prev = ttsShortcuts.get(action);
    if (!prev) return;
    if (isUiohookActive()) unregisterUiohookShortcut(`tts:${action}`);
    else { try { globalShortcut.unregister(prev); } catch (_) { /* best-effort */ } }
    ttsShortcuts.delete(action);
  }

  ipcMain.handle('register-tts-shortcut', (_event, { action, shortcut }) => {
    if (!TTS_SHORTCUT_ACTIONS.has(action)) return { ok: false, error: 'Accion desconocida' };
    if (!shortcut) {
      unregisterTtsShortcut(action);
      return { ok: true, shortcut: null };
    }
    const normalized = normalizeShortcut(shortcut);
    if (!isValidShortcut(normalized)) {
      logger.log(
        'warn', 'electron-shell', 'electron-shell/ipc-bridge.js#attachIpcBridge', 'electron_shell.shortcut.invalido',
        `Atajo TTS invalido o reservado rechazado: ${normalized}`, { action, shortcut: normalized }
      );
      return { ok: false, shortcut: normalized, error: 'Atajo invalido o reservado por el sistema' };
    }
    for (const [otherAction, otherShortcut] of ttsShortcuts) {
      if (otherAction !== action && otherShortcut === normalized) {
        return { ok: false, shortcut: normalized, error: 'conflict' };
      }
    }
    unregisterTtsShortcut(action);

    const callback = () => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) win.webContents.send('tts-shortcut', action);
    };

    // MediaPlayPause pasa por la API multimedia de Windows — funciona en
    // fullscreen sin uiohook. Se usa globalShortcut para esa tecla; uiohook
    // para el resto.
    const isMediaKey = normalized === 'MediaPlayPause';

    if (isUiohookActive() && !isMediaKey) {
      const ok = registerUiohookShortcut(`tts:${action}`, normalized, callback);
      if (!ok) return { ok: false, shortcut: normalized, error: 'Atajo no soportado. Prueba F8, Ctrl+F8 o MediaPlayPause.' };
      ttsShortcuts.set(action, normalized);
      return { ok: true, shortcut: normalized };
    }

    try {
      const registered = globalShortcut.register(normalized, callback);
      if (!registered || !globalShortcut.isRegistered(normalized)) {
        return { ok: false, shortcut: normalized, error: 'Windows no permitio registrar este atajo. Prueba F8 o MediaPlayPause.' };
      }
      ttsShortcuts.set(action, normalized);
      return { ok: true, shortcut: normalized };
    } catch (error) {
      logger.log(
        'warn', 'electron-shell', 'electron-shell/ipc-bridge.js#attachIpcBridge', 'electron_shell.shortcut.registro_fallido',
        `Fallo registrando atajo TTS (${action}): ${error.message}`, { action, error: error.message }
      );
      return { ok: false, shortcut: normalized, error: error.message };
    }
  });

  // ── Soundpad shortcuts — contrato de bus definido en sonido/soundpad/shortcuts.js (Fase 9) ──
  const soundpadShortcuts = new Map(); // soundId -> normalizedShortcut

  ipcMain.handle('register-soundpad-shortcut', (_event, { soundId, shortcut }) => {
    if (!soundId) return { ok: false, error: 'soundId requerido' };

    const prev = soundpadShortcuts.get(soundId);
    if (prev) {
      if (isUiohookActive()) unregisterUiohookShortcut(`soundpad:${soundId}`);
      else { try { globalShortcut.unregister(prev); } catch (_) { /* best-effort */ } }
      soundpadShortcuts.delete(soundId);
    }

    if (!shortcut) return { ok: true, shortcut: null };

    const normalized = normalizeShortcut(shortcut);
    if (!normalized) return { ok: false, error: 'Atajo inválido' };

    const playCallback = () => bus.emit('sonido:soundpad-reproducir', { soundId });

    if (isUiohookActive()) {
      const ok = registerUiohookShortcut(`soundpad:${soundId}`, normalized, playCallback);
      if (!ok) return { ok: false, error: 'Atajo no soportado por uiohook' };
    } else {
      try {
        const registered = globalShortcut.register(normalized, playCallback);
        if (!registered) return { ok: false, error: 'Windows no permitió registrar este atajo' };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }

    soundpadShortcuts.set(soundId, normalized);
    return { ok: true, shortcut: normalized };
  });

  ipcMain.handle('unregister-soundpad-shortcut', (_event, soundId) => {
    const prev = soundpadShortcuts.get(soundId);
    if (prev) {
      if (isUiohookActive()) unregisterUiohookShortcut(`soundpad:${soundId}`);
      else { try { globalShortcut.unregister(prev); } catch (_) { /* best-effort */ } }
      soundpadShortcuts.delete(soundId);
    }
    return { ok: true };
  });

  return {
    unregisterAllTtsShortcuts: () => { for (const action of ttsShortcuts.keys()) unregisterTtsShortcut(action); },
    clearSoundpadShortcuts: () => soundpadShortcuts.clear(),
  };
}

module.exports = { attachIpcBridge, normalizeShortcut, isValidShortcut };
