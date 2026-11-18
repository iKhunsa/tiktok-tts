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
// SetWindowsHookEx. Que teclas reporta (hasta MAX_TECLADO_KEYS, nunca el
// teclado completo: no es un keylogger) mas los 5 botones de mouse de abajo
// (fijos) es configurable desde la app (core/teclado-keys.js, config.tecladoKeys)
// — esto solo sabe traducir un nombre de tecla ('Q', 'SPACE', '3', 'F5', ...)
// al keycode de uiohook-napi.
const { DEFAULT_TECLADO_KEYS, isValidTecladoKeys } = require('../core/teclado-keys');

function buildTecladoKeyCodes(UiohookKey) {
  const K = UiohookKey;
  const map = {};
  'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').forEach((c) => { map[c] = K[c]; });
  '0123456789'.split('').forEach((d) => { map[d] = K[`Num${d}`] ?? K[d]; });
  for (let i = 1; i <= 12; i++) map[`F${i}`] = K[`F${i}`];
  map.SPACE = K.Space;
  map.TAB = K.Tab;
  map.SHIFT = K.Shift; // solo shift izquierdo, K.ShiftRight se ignora
  return map;
}

// keys: lista de entradas { key, w } elegidas por el usuario (w es el ancho
// visual, irrelevante aca). Una tecla sin keycode conocido (nombre mal
// tipeado, o ausente de buildTecladoKeyCodes) queda muda en vez de romper el
// resto del mapa.
function buildTecladoKeyMap(UiohookKey, keys) {
  const codes = buildTecladoKeyCodes(UiohookKey);
  const map = {};
  for (const entry of keys) {
    const keycode = codes[entry.key];
    if (keycode != null) map[keycode] = entry.key;
  }
  return map;
}
// Numeracion de boton normalizada por libuiohook (WM_RBUTTON->2, WM_MBUTTON->3, XBUTTON1/2->4/5 en Windows).
// Fijo: los 5 botones de mouse son el dibujo del mouse en si, no se agregan/quitan.
const TECLADO_MOUSE_MAP = { 1: 'M1', 2: 'M2', 3: 'M3', 4: 'M4', 5: 'M5' };
const tecladoHeld = new Set();

function attachTecladoOverlay(bus) {
  if (!uiohook || !bus) return;
  let keys = DEFAULT_TECLADO_KEYS;
  bus.emit('config:get', (c) => { if (c && isValidTecladoKeys(c.tecladoKeys)) keys = c.tecladoKeys; });
  let keyMap = buildTecladoKeyMap(uiohook.UiohookKey, keys);

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

  // Cambio de teclas en caliente (preset nuevo, agregar/quitar/reordenar desde
  // la app): reconstruye el mapa y suelta cualquier tecla que haya quedado
  // "on" en el overlay por si el cambio ocurrio a mitad de una pulsacion.
  bus.on('config:actualizado', ({ keysChanged } = {}) => {
    if (!keysChanged || !keysChanged.includes('tecladoKeys')) return;
    bus.emit('config:get', (c) => {
      if (!c || !isValidTecladoKeys(c.tecladoKeys)) return;
      keyMap = buildTecladoKeyMap(uiohook.UiohookKey, c.tecladoKeys);
      tecladoHeld.clear();
      bus.emit('ws:broadcast', { type: 'teclado-input', t: 'r' });
    });
  });
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
