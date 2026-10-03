'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

async function importarModuloFrontend(ruta) {
  const fuente = fs.readFileSync(ruta, 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(fuente)}`);
}

test('enlacesLegales devuelve las páginas españolas solo para es', async () => {
  const { enlacesLegales } = await importarModuloFrontend('interfaz/src/vistas/principal/cuenta/enlaces-legales.js');

  assert.deepEqual(enlacesLegales('es'), {
    terminos: 'https://tiklivetts.es/terminos.html',
    privacidad: 'https://tiklivetts.es/privacidad.html',
  });
});

test('enlacesLegales devuelve las páginas inglesas para en, otros idiomas y desconocidos', async () => {
  const { enlacesLegales } = await importarModuloFrontend('interfaz/src/vistas/principal/cuenta/enlaces-legales.js');
  const enlacesEn = {
    terminos: 'https://tiklivetts.es/en/terms.html',
    privacidad: 'https://tiklivetts.es/en/privacy.html',
  };

  for (const idioma of ['en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'desconocido']) {
    assert.deepEqual(enlacesLegales(idioma), enlacesEn);
  }
});

test('el aviso solo se incluye al registrar una cuenta', async () => {
  const { avisoRegistroHtml } = await importarModuloFrontend('interfaz/src/vistas/principal/cuenta/aviso-registro-html.js');

  assert.match(avisoRegistroHtml(true), /cuentaRegisterTerms/);
  assert.equal(avisoRegistroHtml(false), '');
});
