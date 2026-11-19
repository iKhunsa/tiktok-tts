'use strict';

// Camino de los atajos de escena en el proceso principal: registrar -> tecla global -> aviso al renderer.
// Se usa el modulo real electron-shell/uiohook.js con un uiohook-napi y un electron falsos (el nativo aborta sin display en CI).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

let rutaNapi = null;
try { rutaNapi = require.resolve('uiohook-napi'); } catch (_) { /* sin la dependencia no hay nada que simular */ }

const handlers = {};
const rutaElectron = require.resolve('electron');
require.cache[rutaElectron] = {
  id: rutaElectron, filename: rutaElectron, loaded: true,
  exports: { ipcMain: { on() {}, handle: (canal, fn) => { handlers[canal] = fn; } } },
};

const uIOhook = Object.assign(new EventEmitter(), { start() {}, stop() {} });
const UiohookKey = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letra) => { UiohookKey[letra] = letra.charCodeAt(0); });
'0123456789'.split('').forEach((digito) => { UiohookKey[digito] = 100 + Number(digito); });
for (let i = 1; i <= 12; i++) UiohookKey[`F${i}`] = 200 + i;
if (rutaNapi) require.cache[rutaNapi] = { id: rutaNapi, filename: rutaNapi, loaded: true, exports: { uIOhook, UiohookKey } };

const registros = [];
const logger = { log: (nivel, _dominio, _funcion, evento, _mensaje, datos) => registros.push({ nivel, evento, datos }) };
const enviados = [];
let ventana = { isDestroyed: () => false, webContents: { send: (canal, id) => enviados.push([canal, id]) } };

const opciones = { skip: !rutaNapi && 'uiohook-napi no esta instalado' };
const bus = new EventEmitter();
if (rutaNapi) {
  require('../electron-shell/uiohook').startUiohook(logger, bus);
  require('../electron-shell/ipc-bridge').attachIpcBridge({ app: {}, bus, logger, getMainWindow: () => ventana, globalShortcut: { register: () => true, unregister() {} } });
}

const registrar = (escenaId, shortcut) => handlers['register-scene-shortcut'](null, { escenaId, shortcut });
const pulsar = (tecla, { ctrl = false, shift = false, alt = false } = {}) => uIOhook.emit('keydown', { keycode: UiohookKey[tecla], ctrlKey: ctrl, shiftKey: shift, altKey: alt });
const limpiar = () => { enviados.length = 0; registros.length = 0; };

test('un atajo guardado avisa al renderer con el id de su escena', opciones, async () => {
  limpiar();
  assert.deepEqual(await registrar('a', 'ctrl+q'), { ok: true, shortcut: 'Ctrl+Q' });
  assert.deepEqual(await registrar('b', 'Alt+1'), { ok: true, shortcut: 'Alt+1' });
  assert.deepEqual(await registrar('c', 'Ctrl+Shift+F5'), { ok: true, shortcut: 'Ctrl+Shift+F5' });
  pulsar('Q', { ctrl: true });
  pulsar('1', { alt: true });
  pulsar('F5', { ctrl: true, shift: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'a'], ['scene-shortcut', 'b'], ['scene-shortcut', 'c']]);
});

test('el atajo exige exactamente sus modificadores', opciones, () => {
  limpiar();
  pulsar('Q'); // sin Ctrl
  pulsar('Q', { ctrl: true, shift: true }); // Shift de mas
  pulsar('W', { ctrl: true }); // otra tecla
  assert.deepEqual(enviados, []);
});

test('registrar otra vez la misma escena (recarga del renderer) reemplaza el atajo y no lo duplica', opciones, async () => {
  limpiar();
  await registrar('a', 'Ctrl+Q');
  await registrar('a', 'Ctrl+Q');
  pulsar('Q', { ctrl: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'a']]);
  await registrar('a', 'Ctrl+W');
  pulsar('Q', { ctrl: true });
  pulsar('W', { ctrl: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'a'], ['scene-shortcut', 'a']]);
  assert.equal(enviados.length, 2); // Ctrl+Q ya no dispara
});

test('dos escenas no pueden compartir atajo y el fallo queda en los logs', opciones, async () => {
  limpiar();
  await registrar('x', 'Ctrl+9');
  assert.deepEqual(await registrar('y', 'Ctrl+9'), { ok: false, error: 'conflict' });
  assert.equal(registros.filter(({ evento }) => evento === 'electron_shell.atajo_escena.no_registrado').length, 1);
  pulsar('9', { ctrl: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'x']]);
});

test('sin ventana principal el atajo no revienta y lo deja anotado', opciones, async () => {
  await registrar('z', 'Alt+2');
  const original = ventana;
  ventana = null;
  limpiar();
  pulsar('2', { alt: true });
  ventana = original;
  assert.deepEqual(enviados, []);
  assert.equal(registros.find(({ evento }) => evento === 'electron_shell.atajo_escena.activado').datos.entregado, false);
});

test('un cambio de atajo rechazado deja funcionando el anterior', opciones, async () => {
  limpiar();
  await registrar('k', 'Ctrl+8');
  assert.deepEqual(await registrar('k', 'Shift+!'), { ok: false, error: 'Atajo inválido o reservado por el sistema' });
  pulsar('8', { ctrl: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'k']]);
  // ...y uno valido lo reemplaza de verdad.
  assert.deepEqual(await registrar('k', 'Shift+1'), { ok: true, shortcut: 'Shift+1' });
  limpiar();
  pulsar('8', { ctrl: true });
  pulsar('1', { shift: true });
  assert.deepEqual(enviados, [['scene-shortcut', 'k']]);
});
