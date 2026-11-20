'use strict';

// componentes/temporada/catalogo.js es ESM sin DOM al importarlo: node --test lo carga dinamicamente.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = () => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', 'componentes', 'temporada', 'catalogo.js')).href);
const dia = (mes, diaDelMes) => new Date(2026, mes - 1, diaDelMes, 12);

test('Winter Season esta vigente del 1 al 30 de diciembre, ambos dias incluidos', async () => {
  const { temporadaVigente } = await cargar();
  assert.equal(temporadaVigente(dia(11, 30))?.id, undefined);
  assert.equal(temporadaVigente(dia(12, 1))?.id, 'winter');
  assert.equal(temporadaVigente(dia(12, 15))?.id, 'winter');
  assert.equal(temporadaVigente(dia(12, 30))?.id, 'winter');
  assert.equal(temporadaVigente(dia(12, 31)), null);
});

test('una temporada se puede forzar por id fuera de fechas, y un id desconocido no muestra nada', async () => {
  const { temporadaVigente, temporadaForzada } = await cargar();
  assert.equal(temporadaVigente(dia(6, 10), 'winter')?.id, 'winter');
  assert.equal(temporadaVigente(dia(12, 10), 'otra'), null);
  assert.equal(temporadaForzada('?temporada=winter'), 'winter');
  assert.equal(temporadaForzada(''), null);
});

test('cada temporada del catalogo tiene lo que el contenedor necesita', async () => {
  const { TEMPORADAS } = await cargar();
  for (const temporada of TEMPORADAS) {
    assert.ok(temporada.id && temporada.escena && temporada.ventana.desde && temporada.ventana.hasta, temporada.id);
    assert.ok(temporada.pestanas.length > 0 && temporada.pestanas.every(({ id, saldo }) => id && typeof saldo === 'boolean'), `${temporada.id}: pestanas mal definidas`);
  }
});

test('los textos de cada temporada y de sus pestanas existen en todos los idiomas', async () => {
  const { TEMPORADAS } = await cargar();
  const fs = require('node:fs');
  const carpeta = path.join(__dirname, '..', 'interfaz', 'publico', 'locales');
  for (const archivo of fs.readdirSync(carpeta).filter((nombre) => nombre.endsWith('.json'))) {
    const { temporada } = JSON.parse(fs.readFileSync(path.join(carpeta, archivo), 'utf8'));
    for (const clave of ['ahoraNo', 'proximamente', 'siguiente']) assert.ok(temporada[clave], `${archivo}: falta temporada.${clave}`);
    for (const clave of ['titulo', 'volver']) assert.ok(temporada.banco[clave], `${archivo}: falta temporada.banco.${clave}`);
    for (const clave of ['titulo', 'entendido']) assert.ok(temporada.guia[clave], `${archivo}: falta temporada.guia.${clave}`);
    for (const { id, pestanas } of TEMPORADAS) {
      for (const clave of ['nombre', 'abrir', 'titulo1', 'titulo2', 'descripcion', 'descubre', 'guia']) assert.ok(temporada[id][clave], `${archivo}: falta temporada.${id}.${clave}`);
      for (const pestana of pestanas) assert.ok(temporada.pestana[pestana.id], `${archivo}: falta la pestana ${pestana.id}`);
    }
  }
});
