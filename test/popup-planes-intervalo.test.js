const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(resolve(__dirname, '../interfaz/src/componentes/popup-planes.js'), 'utf8');
const LANGS = ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru'];
const locale = (lang) => JSON.parse(readFileSync(resolve(__dirname, `../interfaz/publico/locales/${lang}.json`), 'utf8')).planesPopup;

test('el popup de planes abre en mensual y los precios iniciales derivan del intervalo por defecto', () => {
  assert.match(source, /const INTERVALO_DEFAULT = 'month';/);
  assert.match(source, /formatoPrecio\(PLANES\[plan\]\.precios\[intervalo\]\)/);
});

test('precios y ahorro anual: Sin Promos US$3/US$25 (31%), Pro US$8/US$85 (11%)', () => {
  assert.match(source, /'sin-promos': \{[^}]*precios: \{ month: 3, year: 25 \}/);
  assert.match(source, /pro: \{[^}]*precios: \{ month: 8, year: 85 \}/);
  const ahorro = (m, y) => Math.round(100 - (100 * y) / (12 * m));
  assert.equal(ahorro(3, 25), 31);
  assert.equal(ahorro(8, 85), 11);
});

test('todas las claves del popup usadas por el código existen en los 10 idiomas', () => {
  const usadas = new Set([...source.matchAll(/planesPopup\.(\w+)/g)].map((m) => m[1]));
  for (const k of ['freeTts', 'freeChat', 'freeModeration', 'freeOverlays', 'freeBugs', 'proMusic', 'proSoundpad', 'proCanvas', 'proClips', 'proMcp', 'proOverlays', 'proMobile', 'freeTag', 'noAdsTag', 'proTag', 'currentLine', 'billingSaveUpTo']) usadas.add(k);
  for (const lang of LANGS) {
    const p = locale(lang);
    for (const k of usadas) assert.ok(p[k], `${lang}: falta planesPopup.${k}`);
    assert.match(p.billingSaveUpTo, /\{pct\}/, `${lang}: billingSaveUpTo sin {pct}`);
    assert.match(p.savings, /\{pct\}/, `${lang}: savings sin {pct}`);
  }
});
