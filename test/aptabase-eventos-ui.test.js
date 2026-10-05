'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

// SDK falso: captura los trackEvent en vez de hacer POST.
const enviados = [];
const rutaSdk = require.resolve('@aptabase/electron/main');
require.cache[rutaSdk] = {
  id: rutaSdk, filename: rutaSdk, loaded: true,
  exports: { initialize() {}, trackEvent: async (n, p) => { enviados.push([n, p]); } },
};
process.env.APTABASE_APP_KEY = 'A-SH-test';
const aptabase = require('../electron-shell/aptabase');

const bus = new EventEmitter();
bus.on('config:get', () => {});
aptabase.init({ appVersion: '0.0.0', isPackaged: false, isDebug: true });
aptabase.attach(bus, null);
const ultimo = () => enviados[enviados.length - 1];

test('cada origen de Discord conserva su source (connect_fail ya no cae en otro)', () => {
  for (const s of ['titlebar', 'sidebar', 'account_menu', 'sidebar_banner', 'connect_fail', 'chat_banner_2', 'bug_report']) {
    bus.emit('ui:discord-joined', s);
    assert.deepEqual(ultimo(), ['discord_join_clicked', { source: s }]);
  }
  bus.emit('ui:discord-opened', 'inventado');
  assert.deepEqual(ultimo(), ['discord_modal_opened', { source: 'otro' }]);
});

test('view_opened: lista cerrada y una vez por vista y sesión', () => {
  const n = enviados.length;
  bus.emit('ui:view-opened', 'moderacion');
  bus.emit('ui:view-opened', 'moderacion');
  bus.emit('ui:view-opened', 'texto-libre');
  assert.equal(enviados.length, n + 1);
  assert.deepEqual(ultimo(), ['view_opened', { view: 'moderacion' }]);
});

test('overlay_url_copied manda el tipo; cada copia cuenta', () => {
  bus.emit('ui:overlay-copied', 'alertas-social');
  bus.emit('ui:overlay-copied', 'alertas-social');
  assert.deepEqual(enviados.slice(-2), [['overlay_url_copied', { overlay: 'alertas-social' }], ['overlay_url_copied', { overlay: 'alertas-social' }]]);
});

test('bug_report_sent no lleva el enlace del canal', () => {
  bus.emit('reporte-bug:enviado', { canal: 'https://tiktok.com/@alguien', version: '1.0.0' });
  assert.deepEqual(ultimo(), ['bug_report_sent', { version: '1.0.0' }]);
});

test('fallo de conexión: solo plataforma y código', () => {
  bus.emit('log:entry', { event: 'canales.conexion.fallida', data: { platform: 'tiktok', code: 'X', error: 'canal @alguien' } });
  assert.deepEqual(ultimo(), ['platform_connect_failed', { platform: 'tiktok', code: 'X' }]);
});
