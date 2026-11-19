const test = require('node:test');
const assert = require('node:assert/strict');
let migrarDominiosOverlay, ajustesSegunPlan, resolverReproduccion, ESQUEMAS;
test.before(async () => {
  ({ migrarDominiosOverlay } = await import('../interfaz/compartido/estilo/migrar-dominios-overlay.js'));
  ({ ajustesSegunPlan } = await import('../interfaz/compartido/estilo/ajustes-segun-plan.js'));
  ({ resolverReproduccion } = await import('../interfaz/compartido/acceso-reproduccion.js'));
  ({ ESQUEMAS } = await import('../interfaz/compartido/estilo/esquemas.js'));
});

const libre = { pro: false, adquiridas: [], licencias: {} };
const url = 'http://localhost:3000/overlay-chat.html?skin=terminal';

test('migracion conserva escenas y epik sin compartir objetos con el catalogo ni otras escenas', () => {
  const datos = migrarDominiosOverlay({
    overlays: { chat: { skin: 'terminal', tamano: 18 }, 'gif:uno': { src: 'http://localhost/gif.png' } },
    epik: { paquete: { titulo: 'Original' } }, overlayLienzo: '9:16',
    escenas: [{ id: 'a', ids: ['chat', 'gif:uno'], ajustes: { chat: { tamano: 22 } } }, { id: 'b', ids: ['chat'] }],
  });
  assert.equal(datos.escenas[0].ajustes.chat.tamano, 22);
  assert.equal(datos.escenas[1].ajustes.chat.tamano, 18);
  assert.equal(datos.escenas[0].formato, '9:16');
  assert.equal(datos.escenas[0].ajustes['gif:uno'].src, 'http://localhost/gif.png');
  assert.ok(!('gif:uno' in datos.overlays));
  datos.escenas[0].ajustes.chat.epik.paquete.titulo = 'Escena A';
  datos.overlays.chat.tamano = 30;
  assert.equal(datos.overlays.chat.epik.paquete.titulo, 'Original');
  assert.equal(datos.escenas[1].ajustes.chat.epik.paquete.titulo, 'Original');
  assert.equal(datos.escenas[0].ajustes.chat.tamano, 22);
  const copia = globalThis.structuredClone(datos);
  assert.deepEqual(migrarDominiosOverlay(datos), copia, 'la migracion no se repite');
});

test('las escenas antiguas en forma de lista tambien conservan sus capas', () => {
  const datos = migrarDominiosOverlay({ overlays: { chat: { skin: 'cristal' } }, escenas: [['chat']] });
  assert.equal(datos.escenas[0].ajustes.chat.skin, 'cristal');
});

test('una compra habilita la skin en ambos dominios sin conceder escenas Pro', () => {
  const derecho = { ...libre, adquiridas: ['skin:terminal'] };
  assert.equal(resolverReproduccion(url, derecho).skin, 'terminal');
  assert.equal(ajustesSegunPlan(ESQUEMAS.chat, { skin: 'terminal' }, false, derecho.adquiridas).skin, 'terminal');
  assert.equal(resolverReproduccion(url + '&unificado=1', derecho).bloqueado, true);
  assert.equal(resolverReproduccion('http://localhost/overlay-escena.html?l=/overlay-chat.html', derecho).bloqueado, true);
});

test('URLs antiguas pierden la skin Pro al vencer y la recuperan al renovar', () => {
  assert.equal(resolverReproduccion(url, { ...libre, pro: true }).skin, 'terminal');
  assert.equal(resolverReproduccion(url, libre).skin, 'clasica');
  assert.equal(resolverReproduccion(url, { ...libre, pro: true }).skin, 'terminal');
});

test('solo una demo de tienda sin datos del directo puede mostrar una skin sin licencia', () => {
  assert.equal(resolverReproduccion(url + '&preview=1', libre).skin, 'clasica');
  assert.equal(resolverReproduccion(url + '&preview=1&demo=1', libre).skin, 'terminal');
  assert.equal(resolverReproduccion(url + '&preview=1&demo=1&unificado=1', libre).bloqueado, true);
});

test('epik personal, adquirido e incluido en Pro tienen derechos distintos', () => {
  const epik = 'http://localhost/overlay-chat.html?skin=epik:paquete';
  assert.equal(resolverReproduccion(epik, libre).skin, 'epik:paquete');
  const restringida = { ...libre, licencias: { 'epik:paquete': 'pro' } };
  assert.equal(resolverReproduccion(epik, restringida).skin, 'clasica');
  assert.equal(resolverReproduccion(epik, { ...restringida, pro: true }).skin, 'epik:paquete');
  assert.equal(resolverReproduccion(epik, { ...libre, licencias: { 'epik:paquete': 'adquirida' } }).skin, 'epik:paquete');
  assert.equal(resolverReproduccion(epik, { ...restringida, adquiridas: ['skin:epik:paquete'] }).skin, 'epik:paquete');
  assert.equal(resolverReproduccion(epik, { ...libre, disponible: false }).skin, 'clasica');
});

test('una fuente ya abierta revalida el plan y recarga su URL original al perder acceso', async (t) => {
  const { iniciarReproduccionOverlay } = await import('../interfaz/compartido/acceso-reproduccion.js');
  let acceso = { ...libre, pro: true, cuenta: 'a' };
  let revisar;
  let recarga;
  let arranques = 0;
  const previos = Object.fromEntries(['location', 'window', 'document'].map((clave) => [clave, Object.getOwnPropertyDescriptor(globalThis, clave)]));
  t.after(() => {
    for (const [clave, descriptor] of Object.entries(previos)) {
      if (descriptor) Object.defineProperty(globalThis, clave, descriptor);
      else delete globalThis[clave];
    }
  });
  globalThis.location = { href: url, replace(destino) { recarga = destino; } };
  globalThis.window = { history: { replaceState() {} }, addEventListener() {} };
  globalThis.document = { body: { replaceChildren() {} } };
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => acceso }));
  t.mock.method(globalThis, 'setInterval', (fn) => { revisar = fn; return 1; });
  await iniciarReproduccionOverlay(() => { arranques += 1; });
  assert.equal(arranques, 1);
  acceso = { ...libre, cuenta: 'a' };
  await revisar();
  assert.equal(recarga, url);
});
