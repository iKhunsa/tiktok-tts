'use strict';

// Hook de teclado low-level (funciona en fullscreen exclusivo/juegos).
// uiohook-napi usa SetWindowsHookEx(WH_KEYBOARD_LL) en vez de RegisterHotKey,
// asi que dispara aunque un juego DirectX fullscreen tenga el foco.
let uiohook = null;
let uiohookActive = false;
try { uiohook = require('uiohook-napi'); } catch (_) { /* no disponible en este SO/build */ }

const UIOHOOK_KEYS = (() => {
  const map = {};
  if (!uiohook) return map;
  const K = uiohook.UiohookKey;
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c) => { map[c] = K[c]; });
  '0123456789'.split('').forEach((d) => { map[d] = K[`Num${d}`] ?? K[d]; });
  for (let i = 1; i <= 12; i++) map[`F${i}`] = K[`F${i}`];
  return map;
})();

function makeUiohookCheck(electronShortcut) {
  const parts = electronShortcut.split('+').map((p) => p.trim());
  const needCtrl = parts.some((p) => ['Ctrl', 'CommandOrControl', 'Control', 'Cmd', 'Command'].includes(p));
  const needShift = parts.includes('Shift');
  const needAlt = parts.includes('Alt');
  const keyParts = parts.filter((p) => !['Ctrl', 'CommandOrControl', 'Control', 'Cmd', 'Command', 'Shift', 'Alt', 'Super', 'Meta'].includes(p));
  if (!keyParts.length) return null;
  const keycode = UIOHOOK_KEYS[keyParts[0].toUpperCase()];
  if (keycode == null) return null;
  return (e) => e.keycode === keycode && !!e.ctrlKey === needCtrl && !!e.shiftKey === needShift && !!e.altKey === needAlt;
}

const shortcuts = new Map(); // id -> { check, callback }

function registerUiohookShortcut(id, electronShortcut, callback) {
  const check = makeUiohookCheck(electronShortcut);
  if (!check) return false;
  shortcuts.set(id, { check, callback });
  return true;
}

function unregisterUiohookShortcut(id) {
  shortcuts.delete(id);
}

function startUiohook(logger) {
  if (!uiohook || uiohookActive) return;
  try {
    uiohook.uIOhook.on('keydown', (e) => {
      for (const { check, callback } of shortcuts.values()) {
        if (check(e)) callback();
      }
    });
    uiohook.uIOhook.start();
    uiohookActive = true;
    logger.log(
      'info', 'electron-shell', 'electron-shell/uiohook.js#startUiohook', 'electron_shell.uiohook.activo',
      'uiohook-napi activo — atajos funcionan en fullscreen', {}
    );
  } catch (error) {
    logger.log(
      'warn', 'electron-shell', 'electron-shell/uiohook.js#startUiohook', 'electron_shell.uiohook.fallback_globalshortcut',
      `uiohook-napi fallo, usando globalShortcut: ${error.message}`, { error: error.message }
    );
    uiohookActive = false;
  }
}

function stopUiohook() {
  if (uiohook && uiohookActive) {
    try { uiohook.uIOhook.stop(); } catch (_) { /* best-effort */ }
    uiohookActive = false;
  }
}

function isUiohookActive() {
  return uiohookActive;
}

module.exports = { registerUiohookShortcut, unregisterUiohookShortcut, startUiohook, stopUiohook, isUiohookActive };
