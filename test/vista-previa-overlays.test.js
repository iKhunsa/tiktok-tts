const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);
const leer = (ruta) => readFileSync(resolve(raiz, ruta), 'utf8');

test('esVistaPrevia solo acepta preview=1', async () => {
  const { esVistaPrevia } = await importar('interfaz/compartido/vista-previa.js');
  assert.equal(esVistaPrevia(new URLSearchParams('preview=1')), true);
  assert.equal(esVistaPrevia(new URLSearchParams('preview=0')), false);
  assert.equal(esVistaPrevia(new URLSearchParams('')), false);
});

test('urlConVistaPrevia agrega el parámetro con ? o &', async () => {
  const { urlConVistaPrevia } = await importar('interfaz/compartido/vista-previa.js');
  assert.equal(urlConVistaPrevia('http://x/overlay-chat.html'), 'http://x/overlay-chat.html?preview=1');
  assert.equal(urlConVistaPrevia('http://x/overlay-chat.html?bg=1'), 'http://x/overlay-chat.html?bg=1&preview=1');
});

test('conMuestra usa la muestra solo en vista previa y sin datos reales', async () => {
  const { conMuestra } = await importar('interfaz/compartido/vista-previa.js');
  const real = [{ user: 'a' }];
  const muestra = [{ user: 'ejemplo' }];
  assert.equal(conMuestra([], muestra, true), muestra);
  assert.equal(conMuestra([], muestra, false).length, 0, 'fuera de la vista previa nunca hay muestra (OBS)');
  assert.equal(conMuestra(real, muestra, true), real, 'con datos reales, siempre los reales');
});

test('las muestras tienen la forma que consume cada overlay', async () => {
  const m = await importar('interfaz/compartido/muestras-vista-previa.js');
  const plataformas = ['tiktok', 'twitch', 'youtube', 'kick'];

  for (const [lista, campo] of [[m.MUESTRA_LIKES, 'totalLikes'], [m.MUESTRA_DONADORES, 'totalCoins']]) {
    assert.equal(lista.length, 10);
    const valores = lista.map((e) => e[campo]);
    assert.deepEqual(valores, [...valores].sort((a, b) => b - a), 'ranking ordenado de mayor a menor');
    assert.ok(lista.every((e) => e.user));
  }
  assert.ok(m.MUESTRA_CHAT.every((c) => c.type === 'chat' && plataformas.includes(c.platform) && c.user && c.comment));
  assert.deepEqual([...new Set(m.MUESTRA_CHAT.map((c) => c.platform))].sort(), [...plataformas].sort(), 'una por plataforma');
  assert.ok(m.MUESTRA_CHAT.some((c) => c.isModerator) && m.MUESTRA_CHAT.some((c) => c.isSubscriber), 'cubre los 3 roles');
  assert.ok(['follow', 'share'].includes(m.MUESTRA_ALERTA_SOCIAL.type) && plataformas.includes(m.MUESTRA_ALERTA_SOCIAL.platform) && m.MUESTRA_ALERTA_SOCIAL.user);
  assert.ok(m.MUESTRA_REGALO.type === 'gift' && m.MUESTRA_REGALO.giftName && m.MUESTRA_REGALO.user && m.MUESTRA_REGALO.repeatCount >= 1);
  assert.ok(m.MUESTRA_VIEWERS > 0 && m.MUESTRA_SEGUIDORES.sesion > 0 && m.MUESTRA_SEGUIDORES.base > 0);
  assert.ok(m.MUESTRA_SOCIAL.seguidores.length && m.MUESTRA_SOCIAL.compartidos.length);
  assert.ok(m.MUESTRA_CREDITOS.donantes.length && m.MUESTRA_CREDITOS.seguidores.length && m.MUESTRA_CREDITOS.compartidos.length);
});

test('los regalos de ejemplo existen en gifts/ para mostrar su imagen real', async () => {
  const { MUESTRA_REGALO } = await importar('interfaz/compartido/muestras-vista-previa.js');
  // Misma normalización que overlay-alertas.js (normalizeStr) sobre el nombre del PNG.
  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const slugs = new Set(readdirSync(resolve(raiz, 'gifts')).flatMap((f) => {
    const m = f.match(/^\d+_(.+)\.png$/i);
    return m ? [normalizar(m[1])] : [];
  }));
  assert.ok(slugs.has(normalizar(MUESTRA_REGALO.giftName)), `no hay imagen para "${MUESTRA_REGALO.giftName}"`);
});

test('cada overlay con muestra importa el modo vista previa', () => {
  const esperado = {
    'overlay-chat.js': 'MUESTRA_CHAT', 'overlay-viewers.js': 'MUESTRA_VIEWERS', 'overlay-likes.js': 'MUESTRA_LIKES',
    'overlay-donadores.js': 'MUESTRA_DONADORES', 'overlay-alertas.js': 'MUESTRA_REGALO',
    'overlay-alertas-social.js': 'MUESTRA_ALERTA_SOCIAL', 'overlay-social.js': 'MUESTRA_SOCIAL',
    'overlay-seguidores.js': 'MUESTRA_SEGUIDORES', 'overlay-creditos.js': 'MUESTRA_CREDITOS',
  };
  for (const [archivo, muestra] of Object.entries(esperado)) {
    const fuente = leer(`interfaz/${archivo}`);
    assert.match(fuente, new RegExp(muestra), `${archivo} no usa ${muestra}`);
    // likes y donadores pasan por iniciar-ranking.js, que es quien decide con esVistaPrevia.
    if (!/overlay-(likes|donadores)/.test(archivo)) assert.match(fuente, /esVistaPrevia/, `${archivo} no consulta esVistaPrevia`);
  }
  assert.match(leer('interfaz/compartido/iniciar-ranking.js'), /esVistaPrevia/);
});

test('las 9 tarjetas de overlay tienen su iframe de vista previa', () => {
  const html = leer('interfaz/index.html');
  for (const tipo of ['chat', 'viewers', 'likes', 'donadores', 'seguidores', 'alertas', 'alertas-social', 'creditos', 'social']) {
    assert.equal((html.match(new RegExp(`data-preview="${tipo}"`, 'g')) || []).length, 1, `falta el iframe de ${tipo}`);
  }
});

test('solo el iframe lleva preview=1: la URL copiada a OBS no', () => {
  const fuente = leer('interfaz/src/vistas/principal/configurador-overlays.js');
  const construir = fuente.slice(fuente.indexOf('export function buildOverlayUrl'), fuente.indexOf('const RETARDO_VISTA_PREVIA_MS'));
  assert.doesNotMatch(construir, /preview|VistaPrevia/);
  assert.match(fuente, /const url = urlConVistaPrevia\(urlOverlay\)/);
  assert.equal((fuente.match(/urlConVistaPrevia\(/g) || []).length, 1, 'solo se aplica al iframe');
});

test('el t() de los overlays interpola {var} (la alerta de regalo decía "de @{user}")', async () => {
  const originales = { fetch: global.fetch, localStorage: global.localStorage };
  const es = JSON.parse(leer('interfaz/publico/locales/es.json'));
  global.fetch = async () => ({ json: async () => es });
  global.localStorage = { getItem: () => 'es' };
  try {
    const { cargarLocaleOverlay, t } = await importar('interfaz/compartido/i18n-overlay.js');
    await cargarLocaleOverlay();
    assert.equal(t('overlayStr.giftFrom', { user: 'luna_vibes' }), 'de @luna_vibes');
    assert.equal(t('overlayStr.giftFrom'), 'de @{user}', 'sin variables no toca el texto');
    assert.equal(t('overlayStr.giftFrom', {}), 'de @{user}', 'variable ausente queda visible, no "undefined"');
    assert.equal(t('clave.que.no.existe', { user: 'x' }), 'clave.que.no.existe');
  } finally {
    global.fetch = originales.fetch;
    global.localStorage = originales.localStorage;
  }
});

test('giftFrom conserva el marcador {user} en los 10 idiomas', () => {
  for (const lang of ['es', 'en', 'it', 'pt', 'fr', 'de', 'zh', 'ja', 'ko', 'ru']) {
    const { overlayStr } = JSON.parse(leer(`interfaz/publico/locales/${lang}.json`));
    assert.match(overlayStr.giftFrom, /\{user\}/, `${lang}: giftFrom sin {user}`);
  }
});

test('créditos se redibuja al cargar el idioma para no dejar claves a la vista', () => {
  const fuente = leer('interfaz/overlay-creditos.js');
  assert.match(fuente, /cargarLocaleOverlay\(\)\.then\(\(\) => \{\s*aplicarI18nOverlay\(\);\s*renderTrack\(\);/);
});

test('la vista previa del chat muestra las 4 plataformas y atenúa las excluidas por el filtro', () => {
  const js = readFileSync(resolve(raiz, 'interfaz/overlay-chat.js'), 'utf8');
  assert.match(js, /if \(!plataformaVisible && !vistaPrevia\) return;/, 'fuera de la vista previa (OBS) se sigue filtrando');
  assert.match(js, /if \(!plataformaVisible\) elemento\.classList\.add\('msg-excluido'\)/);
  assert.match(readFileSync(resolve(raiz, 'interfaz/overlay-chat.css'), 'utf8'), /\.msg-excluido \{ filter: /);
});

test('las alertas de la vista previa quedan fijas; en vivo se retiran como siempre', () => {
  for (const archivo of ['overlay-alertas.js', 'overlay-alertas-social.js']) {
    const fuente = readFileSync(resolve(raiz, `interfaz/${archivo}`), 'utf8');
    assert.match(fuente, /if \(!vistaPrevia\) programarRetiro\(card,/, `${archivo}: la vista previa debe saltarse el retiro`);
    assert.doesNotMatch(fuente, /repetirMuestra|setInterval/, `${archivo}: la vista previa no debe repetir alertas en bucle`);
  }
});
