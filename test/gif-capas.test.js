const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { readFileSync } = require('node:fs');

const raiz = resolve(__dirname, '..');
const importar = (ruta) => import(pathToFileURL(resolve(raiz, ruta)).href);

test('solo ids de capa GIF con forma de id de servidor se aceptan', async () => {
  const { esCapaGif } = await importar('interfaz/compartido/estilo/campos-gif.js');
  assert.equal(esCapaGif('gif:aaa111'), true);
  assert.equal(esCapaGif('gif:0f3c9b1e-2a'), true);
  for (const malo of ['gif:', 'gif:"><img src=x onerror=alert(1)>', 'gif:a b', `gif:${'a'.repeat(33)}`, 'chat', 'gif', null, undefined, 5]) {
    assert.equal(esCapaGif(malo), false, String(malo));
  }
});

test('la URL de OBS de una capa GIF lleva el src aparte y solo los ajustes que cambian', async () => {
  const { urlCapaGif, DEFAULTS_GIF } = await importar('interfaz/compartido/estilo/campos-gif.js');
  const src = 'http://localhost:3000/gifs/aaa111.gif';
  assert.equal(urlCapaGif('http://localhost:3000', { ...DEFAULTS_GIF, src }), `http://localhost:3000/overlay-gif.html?src=${encodeURIComponent(src)}`);
  const url = new URL(urlCapaGif('http://localhost:3000', { ...DEFAULTS_GIF, src, escala: 1.5, opacidad: 0.5, desplazaX: 0.25, desplazaY: -0.1, capaZ: 3 }));
  assert.equal(url.searchParams.get('src'), src);
  assert.deepEqual([url.searchParams.get('zoom'), url.searchParams.get('op'), url.searchParams.get('dx'), url.searchParams.get('dy'), url.searchParams.get('z')], ['1.5', '0.5', '0.25', '-0.1', '3']);
});

test('una capa GIF se lee de su URL con los mismos campos con que se escribe', async () => {
  const { ESQUEMA_GIF, DEFAULTS_GIF, urlCapaGif } = await importar('interfaz/compartido/estilo/campos-gif.js');
  const { leerConfig } = await importar('interfaz/compartido/estilo/query.js');
  const cfg = { ...DEFAULTS_GIF, src: 'https://media.giphy.com/media/x/giphy.gif', escala: 0.75, desplazaX: 0.4, desplazaY: 0.2, opacidad: 0.8 };
  const leida = leerConfig(ESQUEMA_GIF, new URL(urlCapaGif('http://x', cfg)).searchParams);
  // El resto de campos del esquema (los que sume el editor) quedan en su default: la prueba no los enumera.
  assert.deepEqual(leida, { ...DEFAULTS_GIF, escala: 0.75, opacidad: 0.8, desplazaX: 0.4, desplazaY: 0.2 });
  assert.deepEqual(leerConfig(ESQUEMA_GIF, new URLSearchParams('zoom=abc&dx=nope')), DEFAULTS_GIF, 'lo invalido cae al default');
});

test('las tres alertas aceptan un GIF, pero el campo no se dibuja en los ajustes de cada overlay', async () => {
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  const { EVENTOS_ALERTA } = await importar('interfaz/compartido/eventos-alerta.js');
  const alertas = ['alertas', 'alertas-social', ...Object.keys(EVENTOS_ALERTA)];
  for (const id of alertas) {
    const campo = ESQUEMAS[id].find(({ clave }) => clave === 'gifAlerta');
    assert.ok(campo, `${id} sin gifAlerta`);
    assert.deepEqual([campo.param, campo.def, campo.ui], ['gif', '', 'oculto'], id);
  }
  for (const [id, esquema] of Object.entries(ESQUEMAS)) {
    if (!alertas.includes(id)) assert.equal(esquema.some(({ clave }) => clave === 'gifAlerta'), false, `${id} no es una alerta`);
  }
  const montar = readFileSync(resolve(raiz, 'interfaz/src/vistas/principal/campos-overlay/montar.js'), 'utf8');
  assert.match(montar, /grupos\.get\('base'\)\.filter\(\(\{ ui \}\) => ui !== 'oculto'\)/, 'el grupo base no dibuja campos ocultos');
});

test('el overlay de GIF y el de alertas solo cargan direcciones http(s)', () => {
  const gif = readFileSync(resolve(raiz, 'interfaz/overlay-gif.js'), 'utf8');
  const alerta = readFileSync(resolve(raiz, 'interfaz/compartido/imagen-gif-alerta.js'), 'utf8');
  assert.match(gif, /\^https\?:\\\/\\\//);
  assert.match(alerta, /\^https\?:\\\/\\\//);
});

test('el croma quita el color de fondo con tolerancia, difumina el borde y respeta la transparencia', async () => {
  const { aplicarCroma, hexARgb } = await importar('interfaz/compartido/estilo/croma.js');
  assert.deepEqual(hexARgb('#00ff00'), [0, 255, 0]);
  assert.deepEqual(hexARgb('FF8800'), [255, 136, 0]);
  for (const malo of ['', '#fff', 'verde', null, undefined, '#gggggg']) assert.equal(hexARgb(malo), null, String(malo));

  const verde = [0, 255, 0];
  // verde puro, verde algo apagado, rojo y un pixel verde que ya era transparente
  const px = () => new Uint8ClampedArray([0, 255, 0, 255, 20, 230, 20, 255, 255, 0, 0, 255, 0, 255, 0, 0]);
  const alta = px();
  aplicarCroma(alta, verde, 40);
  assert.equal(alta[3], 0, 'el color exacto desaparece');
  assert.equal(alta[7], 0, 'uno parecido tambien');
  assert.equal(alta[11], 255, 'un color lejano se conserva');
  assert.deepEqual([alta[8], alta[9], alta[10]], [255, 0, 0], 'y no se toca su color');
  assert.equal(alta[15], 0, 'lo ya transparente sigue transparente');

  const nula = px();
  aplicarCroma(nula, verde, 0);
  assert.deepEqual([...nula], [...px()], 'tolerancia 0: no quita nada');

  const total = px();
  aplicarCroma(total, verde, 100);
  assert.ok(total[11] < 255, 'con tolerancia maxima hasta el rojo empieza a volverse transparente');

  // el borde se difumina: la opacidad crece con la distancia al color clave
  const limite = (40 / 100) * Math.hypot(255, 255, 255);
  const suave = limite * 0.7;
  const gradiente = [0.2, 0.5, 0.9].map((fraccion) => {
    const distancia = suave + (limite - suave) * fraccion;
    const g = new Uint8ClampedArray([0, Math.round(255 - distancia), 0, 255]);
    aplicarCroma(g, verde, 40);
    return g[3];
  });
  assert.ok(gradiente[0] < gradiente[1] && gradiente[1] < gradiente[2], `degradado creciente: ${gradiente}`);
  assert.ok(gradiente[0] > 0 && gradiente[2] < 255);
});

test('las alertas aceptan un sonido y su volumen por la URL, y solo suena si es http(s)', async () => {
  const { ESQUEMAS } = await importar('interfaz/compartido/estilo/esquemas.js');
  const { EVENTOS_ALERTA } = await importar('interfaz/compartido/eventos-alerta.js');
  const { construirQuery, leerConfig } = await importar('interfaz/compartido/estilo/query.js');
  const alertas = ['alertas', 'alertas-social', ...Object.keys(EVENTOS_ALERTA)];
  for (const id of alertas) {
    const sonido = ESQUEMAS[id].find(({ clave }) => clave === 'sonidoAlerta');
    const volumen = ESQUEMAS[id].find(({ clave }) => clave === 'sonidoVolumen');
    assert.deepEqual([sonido?.param, sonido?.def, sonido?.ui, volumen?.param, volumen?.def], ['snd', '', 'oculto', 'sv', 100], id);
  }
  for (const [id, esquema] of Object.entries(ESQUEMAS)) {
    if (!alertas.includes(id)) assert.equal(esquema.some(({ clave }) => clave === 'sonidoAlerta'), false, `${id} no es una alerta`);
  }
  const esquema = ESQUEMAS.alertas;
  const url = 'http://localhost:3000/sonidos/a1.mp3';
  const consulta = construirQuery(esquema, { ...leerConfig(esquema, new URLSearchParams()), sonidoAlerta: url, sonidoVolumen: 40 });
  const leida = leerConfig(esquema, new URLSearchParams(consulta));
  assert.deepEqual([leida.sonidoAlerta, leida.sonidoVolumen], [url, 40]);
  const helper = readFileSync(resolve(raiz, 'interfaz/compartido/sonido-alerta.js'), 'utf8');
  assert.match(helper, /\^https\?:\\\/\\\//);
  for (const sitio of ['overlay-alertas', 'overlay-alertas-social', 'overlay-evento']) {
    assert.match(readFileSync(resolve(raiz, `interfaz/${sitio}.js`), 'utf8'), /reproducirSonidoAlerta\(cfgFijo\)/, `${sitio} reproduce el sonido`);
  }
});
