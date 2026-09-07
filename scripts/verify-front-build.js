'use strict';

// Corre como `postbuild:front` — despues de CUALQUIER `npm run build:front`,
// incluida la cadena `prebuild:electron` de la CI de release. Si `vite build`
// emitio un build parcial o vacio, corta aca con exit 1 para que el packaging
// NO suba un instalador roto (el frontend viaja como extraResources y un
// interfaz/dist incompleto = app instalada sin UI).

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'interfaz', 'dist');

const REQUIRED = [
  'index.html',
  'advanced.html',
  'mobile.html',
  'overlay-alertas.html',
  'overlay-alertas-social.html',
  'overlay-chat.html',
  'overlay-creditos.html',
  'overlay-likes.html',
  'overlay-seguidores.html',
  'overlay-social.html',
  'assets',
  path.join('locales', 'es.json'),
];

const missing = REQUIRED.filter((rel) => !fs.existsSync(path.join(DIST, rel)));

if (missing.length) {
  console.error(`[verify-front-build] interfaz/dist incompleto — faltan: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('[verify-front-build] OK — interfaz/dist completo');
