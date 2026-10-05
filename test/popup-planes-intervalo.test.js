const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(resolve(__dirname, '../interfaz/src/componentes/popup-planes.js'), 'utf8');

test('el popup de planes abre en mensual y los precios iniciales también', () => {
  assert.match(source, /const INTERVALO_DEFAULT = 'month';/);
  // Los precios iniciales derivan del intervalo por defecto: ni claves anuales fijas ni desfase con el botón activo.
  assert.match(source, /data-price="noAds" data-i18n="planesPopup\.noAdsPrice\$\{SUFIJO_PRECIO\[INTERVALO_DEFAULT\]\}"/);
  assert.match(source, /data-price="pro" data-i18n="planesPopup\.proPrice\$\{SUFIJO_PRECIO\[INTERVALO_DEFAULT\]\}"/);
  assert.doesNotMatch(source, /data-i18n="planesPopup\.(noAds|pro)Price"/);
});

test('las claves de precio mensual existen en los 10 idiomas', () => {
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const { planesPopup } = JSON.parse(readFileSync(resolve(__dirname, `../interfaz/publico/locales/${lang}.json`), 'utf8'));
    assert.ok(planesPopup.noAdsPriceMonthly && planesPopup.proPriceMonthly, `${lang}: faltan precios mensuales`);
  }
});
