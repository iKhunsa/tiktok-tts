'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

// ipcMain falso: guarda los listeners de ipcMain.on para dispararlos a mano.
const listeners = {};
const rutaElectron = require.resolve('electron');
require.cache[rutaElectron] = {
  id: rutaElectron, filename: rutaElectron, loaded: true,
  exports: { ipcMain: { on: (canal, fn) => { listeners[canal] = fn; }, handle() {} } },
};
const { attachIpcBridge } = require('../electron-shell/ipc-bridge');

const bus = new EventEmitter();
attachIpcBridge({ app: {}, bus, logger: null, getMainWindow: () => null, globalShortcut: {} });
const enviarDesdeRenderer = (nombre, payload) => listeners['telemetry:track'](null, nombre, payload);

test('telemetry:track ignora eventos fuera de la lista blanca', () => {
  let llamado = false;
  bus.on('canal:estado', () => { llamado = true; });
  enviarDesdeRenderer('canal:estado', 'x');
  assert.equal(llamado, false);
});

test('telemetry:track conserva un origen largo como sidebar_banner y corta texto libre a 24', () => {
  const recibidos = [];
  bus.on('ui:discord-joined', (v) => recibidos.push(v));
  enviarDesdeRenderer('ui:discord-joined', 'sidebar_banner');
  enviarDesdeRenderer('ui:discord-joined', 'x'.repeat(100));
  enviarDesdeRenderer('ui:discord-joined', { objeto: true });
  assert.deepEqual(recibidos, ['sidebar_banner', 'x'.repeat(24), undefined]);
});
