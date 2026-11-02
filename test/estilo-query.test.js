'use strict';

// interfaz/compartido/estilo/*.js son modulos ESM puros (sin DOM en query/esquemas);
// node --test los importa dinamicamente.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = (archivo) => import(pathToFileURL(path.join(__dirname, '..', 'interfaz', 'compartido', 'estilo', archivo)).href);

test('construirQuery: una config con todo en default produce una URL sin params', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');

  for (const [tipo, esquema] of Object.entries(ESQUEMAS)) {
    assert.equal(construirQuery(esquema, valoresPorDefecto(esquema)), '', `${tipo} no debe emitir defaults`);
  }
});

test('construirQuery: solo viaja lo que difiere del default, con los nombres de param historicos', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = { ...valoresPorDefecto(ESQUEMAS.likes), rows: 5, color: '#FF0000', bg: 0.5 };

  assert.equal(construirQuery(ESQUEMAS.likes, cfg), 'rows=5&color=FF0000&bg=0.5');
});

test('leerConfig: una URL vieja de Top Likers sigue funcionando', async () => {
  const { leerConfig } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = leerConfig(ESQUEMAS.likes, new URLSearchParams('rows=5&color=ff0000&bg=0.5'));

  assert.equal(cfg.rows, 5);
  assert.equal(cfg.color, '#ff0000');
  assert.equal(cfg.bg, 0.5);
  assert.equal(cfg.fuente, 'sistema', 'lo ausente cae al default');
});

test('leerConfig: valores invalidos caen al default en vez de romper el overlay', async () => {
  const { leerConfig } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = leerConfig(ESQUEMAS.chat, new URLSearchParams('size=abc&font=NoExiste&uc=zzz&anim=girar&v_c=nope'));

  assert.equal(cfg.tamano, 14);
  assert.equal(cfg.fuente, 'sistema');
  assert.equal(cfg.viewerColorUsuario, '#ffffff');
  assert.equal(cfg.animacionEntrada, 'slide-up');
});

test('round-trip del chat: construirQuery -> leerConfig devuelve la misma config', async () => {
  const { construirQuery, leerConfig, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = {
    ...valoresPorDefecto(ESQUEMAS.chat),
    fuente: 'Exo 2',
    tamano: 22,
    unaLinea: true,
    ocultarTras: 30,
    moderadorColorUsuario: '#112233',
    suscriptorResplandor: true,
    platforms: { tiktok: true, twitch: false, youtube: true, kick: false },
  };

  const params = new URLSearchParams(construirQuery(ESQUEMAS.chat, cfg));
  assert.deepEqual(leerConfig(ESQUEMAS.chat, params), cfg);
});

test('el chat conserva los params historicos: usernames=0 y platforms=lista', async () => {
  const { construirQuery, valoresPorDefecto } = await cargar('query.js');
  const { ESQUEMAS } = await cargar('esquemas.js');
  const cfg = { ...valoresPorDefecto(ESQUEMAS.chat), usernames: false, platforms: { tiktok: true, twitch: true, youtube: false, kick: false } };

  assert.equal(construirQuery(ESQUEMAS.chat, cfg), 'usernames=0&platforms=tiktok%2Ctwitch');
});

test('ningun esquema repite un param ni una clave', async () => {
  const { ESQUEMAS } = await cargar('esquemas.js');

  for (const [tipo, esquema] of Object.entries(ESQUEMAS)) {
    const params = esquema.map((campo) => campo.param);
    const claves = esquema.map((campo) => campo.clave);
    assert.equal(new Set(params).size, params.length, `${tipo}: param duplicado`);
    assert.equal(new Set(claves).size, claves.length, `${tipo}: clave duplicada`);
  }
});

test('DEFAULTS_OVERLAYS conserva los defaults historicos de los overlays simples', async () => {
  const { DEFAULTS_OVERLAYS } = await cargar('esquemas.js');

  const { goal, color, bg } = DEFAULTS_OVERLAYS.seguidores;
  assert.deepEqual({ goal, color, bg }, { goal: '', color: '#FFBB00', bg: 0.8 });
  assert.equal(DEFAULTS_OVERLAYS.alertas.dur, 4000);
  assert.equal(DEFAULTS_OVERLAYS.alertas.bg, 0.9);
  assert.equal(DEFAULTS_OVERLAYS['alertas-social'].color, '#FFBB00');
  assert.equal(DEFAULTS_OVERLAYS['alertas-social'].bg, 0.9);
  // Lo nuevo no cambia las URLs ya pegadas en OBS: con los defaults no se escribe ningun parametro.
  assert.equal(DEFAULTS_OVERLAYS.seguidores.escala, 1);
});

test('las opciones de tipografia solo viajan si difieren del default y vuelven igual', async () => {
  const { camposTipografia } = await import('../interfaz/compartido/estilo/campos-tipografia.js');
  const { construirQuery, leerConfig, valoresPorDefecto } = await import('../interfaz/compartido/estilo/query.js');
  const esquema = camposTipografia(14);
  const cfg = valoresPorDefecto(esquema);
  assert.equal(construirQuery(esquema, cfg), '');
  const cambiada = { ...cfg, peso: '800', mayusculas: 'uppercase', cursiva: true, contornoGrosor: 2, sombra: true, sombraColor: '#ff0000' };
  assert.deepEqual(leerConfig(esquema, new URLSearchParams(construirQuery(esquema, cambiada))), cambiada);
});

test('la alineacion solo viaja en la URL si difiere del default y vuelve igual', async () => {
  const { camposAlineacion } = await import('../interfaz/compartido/estilo/campos-alineacion.js');
  const { construirQuery, leerConfig, valoresPorDefecto } = await import('../interfaz/compartido/estilo/query.js');
  const esquema = camposAlineacion({ posicionV: 'abajo' });
  const cfg = valoresPorDefecto(esquema);
  assert.equal(construirQuery(esquema, cfg), '');
  const query = construirQuery(esquema, { ...cfg, alineacionTexto: 'justificado', posicionV: 'arriba' });
  assert.equal(query, 'ta=justificado&py=arriba');
  assert.deepEqual(leerConfig(esquema, new URLSearchParams(query)), { ...cfg, alineacionTexto: 'justificado', posicionV: 'arriba' });
});

test('el avatar generado es estable por nombre y distinto entre nombres', async () => {
  const { avatarGenerado } = await import('../interfaz/compartido/avatar-generado.js');
  assert.equal(avatarGenerado('Ana'), avatarGenerado('Ana'));
  assert.notEqual(avatarGenerado('Ana'), avatarGenerado('Beto'));
  for (const nombre of ['Ana', '', undefined, 'ñandú_99', '日本語']) {
    const svg = decodeURIComponent(avatarGenerado(nombre).split(',')[1]);
    assert.match(svg, /^<svg /);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

test('el selector de color convierte hex y hsv sin perder el valor', async () => {
  const { hexAHsv, hsvAHex, normalizarHex } = await import('../interfaz/src/componentes/selector-color/color.js');
  for (const hex of ['#000000', '#ffffff', '#f0213a', '#53fc18', '#9146ff', '#808080']) {
    assert.equal(hsvAHex(hexAHsv(hex)), hex);
  }
  assert.equal(normalizarHex('ABC'), '#aabbcc');
  assert.equal(normalizarHex(' #F0213A '), '#f0213a');
  assert.equal(normalizarHex('#12'), null);
});

test('las favoritas se ponen, se quitan y respetan el maximo', async () => {
  const { MAX_FAVORITAS, SKINS_PREMIUM, alternarFavorita, camposChat } = await import('../interfaz/compartido/estilo/campos-chat.js');
  assert.deepEqual(alternarFavorita([], 'retro'), ['retro']);
  assert.deepEqual(alternarFavorita(['retro'], 'retro'), []);
  const llena = Array.from({ length: MAX_FAVORITAS }, (_, i) => `s${i}`);
  assert.equal(alternarFavorita(llena, 'retro'), null);
  assert.deepEqual(alternarFavorita(llena, 's0').length, MAX_FAVORITAS - 1);
  const opciones = camposChat().find(({ clave }) => clave === 'skin').opciones;
  assert.ok(SKINS_PREMIUM.every((skin) => opciones.includes(skin)));
});
