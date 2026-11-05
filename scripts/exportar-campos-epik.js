#!/usr/bin/env node
'use strict';

/**
 * Exporta los ajustes de cada overlay que acepta .epik al kit de Epik, para que su simulador
 * muestre los mismos controles que la app:  node scripts/exportar-campos-epik.js [carpeta-del-kit]
 * Escribe herramientas/campos/<overlay>.json y copia el validador del manifest.
 * Correrlo cada vez que cambie un esquema (interfaz/compartido/estilo/) o features/epik/validate-manifest.js.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { FAMILIAS } = require('../features/epik/validate-manifest');

const KIT = process.argv[2] || path.join(os.homedir(), 'OneDrive', 'Documentos', '.tiklivetts', 'Templete Overlay');
const CLAVES = ['clave', 'tipo', 'def', 'min', 'max', 'step', 'opciones', 'grupo'];
const limpio = (campo) => Object.fromEntries(CLAVES.filter((clave) => campo[clave] !== undefined).map((clave) => [clave, campo[clave]]));

(async () => {
  const { ESQUEMAS } = await import('../interfaz/compartido/estilo/esquemas.js');
  const destino = path.join(KIT, 'herramientas', 'campos');
  fs.mkdirSync(destino, { recursive: true });
  for (const overlay of Object.values(FAMILIAS).flat()) {
    if (!ESQUEMAS[overlay]) throw new Error(`no hay esquema para ${overlay}`);
    fs.writeFileSync(path.join(destino, `${overlay}.json`), `${JSON.stringify(ESQUEMAS[overlay].map(limpio), null, 1)}\n`);
  }
  const validador = fs.readFileSync(path.join(__dirname, '..', 'features', 'epik', 'validate-manifest.js'), 'utf8');
  fs.writeFileSync(path.join(KIT, 'herramientas', 'validar-manifest.js'),
    `// Copia de tiktok-tts/features/epik/validate-manifest.js (la escribe scripts/exportar-campos-epik.js: no editar aqui).\n${validador}`);
  console.log(`[ok] ${Object.values(FAMILIAS).flat().join(', ')} -> ${destino}`);
})().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
