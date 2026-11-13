'use strict';

// El editor de canvas entero es Pro. editor-canvas.js arrastra modulos que solo existen en el navegador (GIFs,
// sonidos, iframes), asi que no se puede importar en Node: este test fija por codigo lo que NO debe romperse.
// La prueba de verdad (un usuario free intentando entrar) es manual en la app.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const raiz = resolve(__dirname, '..');
const fuente = readFileSync(resolve(raiz, 'interfaz/src/vistas/principal/overlays-catalogo/editor-canvas.js'), 'utf8');
const cuerpo = (nombre) => {
  const inicio = fuente.indexOf(nombre);
  assert.ok(inicio >= 0, `no existe ${nombre}`);
  return fuente.slice(inicio, inicio + 1000);
};

test('abrirEditorCanvas corta ANTES de tocar nada si no hay acceso Pro', () => {
  const abrir = cuerpo('export function abrirEditorCanvas');
  const guardia = abrir.indexOf('if (!tieneAccesoPro())');
  assert.ok(guardia > 0, 'falta la guardia de plan');
  assert.ok(guardia < abrir.indexOf('usarFormatoPropio('), 'la guardia debe ir antes de usar el editor');
  assert.ok(guardia < abrir.indexOf("$('ovlEditor').hidden = false"), 'la guardia debe ir antes de mostrar el editor');
  const rama = abrir.slice(guardia, abrir.indexOf('return;', guardia) + 7);
  assert.match(rama, /guardarEstadoUi\(\{ editor: false \}\)/, 'no debe recordarse como abierto (se reabriria al recargar)');
  assert.match(rama, /abrirPopupPro\(\)/, 'debe avisar con el popup de Pro');
});

test('todos los botones de entrada pasan por abrirEditorCanvas (y la restauracion tras recargar tambien)', () => {
  assert.match(fuente, /querySelectorAll\('\.ovl-banner-cta, #ovlEditorUnificado'\)/);
  assert.match(fuente, /botonesEntrada\.forEach\(\(boton\) => boton\.addEventListener\('click', abrirEditorCanvas\)\)/);
  const barra = readFileSync(resolve(raiz, 'interfaz/src/vistas/principal/barra-titulo/index.js'), 'utf8');
  assert.match(barra, /getElementById\('ovlEditorUnificado'\)\?\.click\(\)/, 'la restauracion entra por el mismo boton');
});

test('los botones se ven bloqueados sin Pro y el editor abierto se cierra si el plan se pierde', () => {
  const init = fuente.slice(fuente.indexOf('const pintarAcceso'), fuente.indexOf('pintarAcceso();', fuente.indexOf('const pintarAcceso')) + 15);
  assert.match(init, /bloqueado-pro/);
  assert.match(init, /aria-disabled/);
  assert.match(init, /icons\/lock\.svg/);
  assert.match(init, /if \(!acceso && !editor\.hidden\) cerrar\(\)/);
  assert.match(init, /almacenSesion\.subscribe\(pintarAcceso\)/);
});

test('el candado existe como icono servido y el estilo bloqueado esta definido', () => {
  const { existsSync } = require('node:fs');
  assert.ok(existsSync(resolve(raiz, 'interfaz/publico/icons/lock.svg')));
  const css = readFileSync(resolve(raiz, 'interfaz/src/estilos/overlays-catalogo.css'), 'utf8');
  assert.match(css, /\.ovl-editor-unificado\.bloqueado-pro/);
  assert.match(css, /\.ovl-banner-cta\.bloqueado-pro/);
});
