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

// Overlay de teclado/mouse (OBS): mismo hook global que los atajos de arriba,
// solo agrega listeners sobre el emisor ya arrancado -- no abre un segundo
// SetWindowsHookEx. Solo reporta las 14 teclas + 5 botones de mouse de abajo
// (nunca el teclado completo): no es un keylogger, es el mismo subset que usa
// Inkput (la app de referencia de este overlay).
function buildTecladoKeyMap(UiohookKey) {
  const K = UiohookKey;
  return {
    [K.Q]: 'Q', [K.W]: 'W', [K.E]: 'E', [K.R]: 'R',
    [K.A]: 'A', [K.S]: 'S', [K.D]: 'D', [K.F]: 'F',
    [K.Z]: 'Z', [K.X]: 'X', [K.C]: 'C',
    [K.Shift]: 'SHIFT', // solo shift izquierdo, K.ShiftRight se ignora
    [K.Tab]: 'TAB',
    [K.Space]: 'SPACE',
  };
}
// Numeracion de boton normalizada por libuiohook (WM_RBUTTON->2, WM_MBUTTON->3, XBUTTON1/2->4/5 en Windows).
const TECLADO_MOUSE_MAP = { 1: 'M1', 2: 'M2', 3: 'M3', 4: 'M4', 5: 'M5' };
const tecladoHeld = new Set();

function attachTecladoOverlay(bus) {
  if (!uiohook || !bus) return;
  const keyMap = buildTecladoKeyMap(uiohook.UiohookKey);
  const emitir = (t, k) => bus.emit('ws:broadcast', { type: 'teclado-input', t, k });
  const down = (id) => {
    if (!id || tecladoHeld.has(id)) return;
    tecladoHeld.add(id);
    emitir('d', id);
  };
  const up = (id) => {
    if (!id || !tecladoHeld.delete(id)) return;
    emitir('u', id);
  };
  uiohook.uIOhook.on('keydown', (e) => down(keyMap[e.keycode]));
  uiohook.uIOhook.on('keyup', (e) => up(keyMap[e.keycode]));
  uiohook.uIOhook.on('mousedown', (e) => down(TECLADO_MOUSE_MAP[e.button]));
  uiohook.uIOhook.on('mouseup', (e) => up(TECLADO_MOUSE_MAP[e.button]));
}

function startUiohook(logger, bus) {
  if (!uiohook || uiohookActive) return;
  try {
    uiohook.uIOhook.on('keydown', (e) => {
      for (const { check, callback } of shortcuts.values()) {
        if (check(e)) callback();
      }
    });
    attachTecladoOverlay(bus);
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
