'use strict';

// "Cambiar contraseña" del perfil: contraseña actual + nueva contra PATCH /api/account/password (NO el flujo de
// recuperar por codigo). Los modulos de la UI necesitan el navegador, asi que esto fija por codigo el cableado; la
// prueba real (cambiarla de verdad) es manual en la app.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const raiz = resolve(__dirname, '..');
const leer = (ruta) => readFileSync(resolve(raiz, ruta), 'utf8');
const base = 'interfaz/src/vistas/principal/cuenta';
const perfil = leer(`${base}/modal-cuenta/seccion-perfil.js`);
const modal = leer(`${base}/modal-cambiar-password.js`);
const recuperar = leer(`${base}/modal-recuperar.js`);
const rutas = leer('features/auth/routes.js');
const cliente = leer('features/auth/cliente-servicio.js');

test('el boton del perfil abre el modal de cambiar contraseña (ya no dice "Proximamente")', () => {
  assert.match(perfil, /querySelector\('#mcPassword'\)\?\.addEventListener\('click', abrirModalCambiarPassword\)/);
  assert.match(perfil, /import \{ abrirModalCambiarPassword \} from '\.\.\/modal-cambiar-password\.js'/);
  assert.ok(!perfil.includes('cuentaModal.soon'));
});

test('la fila no sale para cuentas sin contraseña (nacieron con Google): no hay "actual" que pedir', () => {
  assert.match(perfil, /\$\{u\.hasPassword === false \? '' : fila\('cuentaModal\.changePassword'/);
});

test('el modal pide actual + nueva + repetir, y manda un PATCH (no usa el codigo por email)', () => {
  assert.match(modal, /campoPass\('cpActual', 'cuentaModal\.currentPassword', 'current-password'\)/);
  assert.match(modal, /campoPass\('cpNueva', 'cuenta\.resetNewPasswordLabel'\)/);
  assert.match(modal, /campoPass\('cpRepetida', 'cuenta\.resetConfirmPasswordLabel'\)/);
  assert.match(modal, /pedir\('\/api\/account\/password', \{ method: 'PATCH', body: \{ currentPassword: actual, newPassword: nueva \} \}\)/);
  assert.ok(!modal.includes('forgot-password') && !modal.includes('reset-password'), 'no es el flujo de recuperar');
});

test('valida que la repetida coincida ANTES de pedir al servidor, y solo manda con Enter desde un campo', () => {
  assert.ok(modal.indexOf("t('cuenta.resetMismatch')") < modal.indexOf("pedir('/api/account/password'"));
  assert.match(modal, /e\.key === 'Enter' && e\.target\.tagName === 'INPUT'/);
});

test('si la actual es incorrecta (403) se vacia y se vuelve a pedir; si sale bien avisa y cierra', () => {
  assert.match(modal, /r\.status === 403/);
  assert.match(modal, /showToast\(t\('cuentaModal\.passwordChanged'\)\);\s*overlay\.remove\(\)/);
});

test('el campo de contraseña esta compartido con el modal de recuperar (no copiado)', () => {
  assert.match(modal, /from '\.\/campo-password\.js'/);
  assert.match(recuperar, /import \{ campoPass, enlazarMostrarPassword \} from '\.\/campo-password\.js'/);
  assert.ok(!recuperar.includes('function campoPass'));
});

test('la app reenvia el PATCH al servicio con la sesion, sin loguear las contraseñas', () => {
  assert.match(cliente, /cambiarPassword: \(token, b\) => pedir\('\/api\/account\/password', \{ method: 'PATCH', token, body: b \}\)/);
  const inicio = rutas.indexOf("app.patch('/api/account/password'");
  const bloque = rutas.slice(inicio, rutas.indexOf("app.get('/api/account/identities'", inicio));
  assert.ok(inicio > 0 && bloque.length > 200, 'no encontre el handler completo');
  assert.match(bloque, /cliente\.cambiarPassword\(token, \{ currentPassword, newPassword \}\)/);
  assert.match(bloque, /errors\.unauthorized/);
  assert.ok(!/logger\.log\([^)]*(currentPassword|newPassword)/.test(bloque), 'no se loguean contraseñas');
});

test('los textos que usa el modal existen en los 10 idiomas', () => {
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const j = JSON.parse(leer(`interfaz/publico/locales/${lang}.json`).replace(/^﻿/, ''));
    const claves = [
      ['cuentaModal', 'changePassword'], ['cuentaModal', 'currentPassword'], ['cuentaModal', 'passwordChanged'],
      ['cuentaModal', 'update'], ['cuenta', 'resetNewPasswordLabel'], ['cuenta', 'resetConfirmPasswordLabel'],
      ['cuenta', 'resetMismatch'], ['cuenta', 'showPassword'], ['cuenta', 'hidePassword'],
      ['errors', 'wrongPassword'], ['errors', 'weakPassword'],
    ];
    for (const [seccion, clave] of claves) assert.ok(j[seccion]?.[clave], `${lang}: falta ${seccion}.${clave}`);
  }
});
