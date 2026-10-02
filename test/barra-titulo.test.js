'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const front = (rel) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'src', rel)).href);

test('historial: atrás/adelante y descarte del adelante al visitar algo nuevo', async () => {
  const { crearHistorialVistas } = await front('nucleo/estado/historial-vistas.js');
  const h = crearHistorialVistas();
  h.registrar('chat'); h.registrar('overlays'); h.registrar('clips');
  assert.equal(h.retroceder(), 'overlays');
  assert.equal(h.puedeAvanzar(), true);
  h.registrar('bot'); // descarta 'clips'
  assert.equal(h.puedeAvanzar(), false);
  assert.equal(h.retroceder(), 'overlays');
  assert.equal(h.retroceder(), 'chat');
  assert.equal(h.retroceder(), null);
  assert.equal(h.puedeRetroceder(), false);
});

test('novedades: expandido 4 días desde la primera vez que se ve la versión', async () => {
  const { novedadVigente } = await front('vistas/principal/novedades/vigencia.js');
  const valores = new Map();
  const storage = { getItem: (k) => valores.get(k) ?? null, setItem: (k, v) => valores.set(k, v) };
  const dia = 24 * 60 * 60 * 1000;
  assert.equal(novedadVigente('1.0.0', 0, storage), true);
  assert.equal(novedadVigente('1.0.0', 3 * dia, storage), true);
  assert.equal(novedadVigente('1.0.0', 4 * dia, storage), false);
  assert.equal(novedadVigente('1.1.0', 5 * dia, storage), true); // versión nueva reinicia el plazo
});

test('changelog: parsea versiones, secciones y viñetas multilínea del CHANGELOG real', async () => {
  const { parsearChangelog } = await front('vistas/principal/novedades/parse-changelog.js');
  const versiones = parsearChangelog(fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8'));
  assert.ok(versiones.length > 10);
  assert.equal(versiones[0].etiqueta, 'prerelease');
  assert.ok(versiones.every((v) => v.version && v.secciones.every((s) => s.items.length > 0)));
  const moderacion = versiones[0].secciones.flatMap((s) => s.items).find((item) => item.startsWith('**Moderación') || item.startsWith('Moderación de chat'));
  assert.match(moderacion, /cuatro plataformas\.$/); // une las líneas de continuación
});
