import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('datos por cuenta separa localStorage y migra una sola vez', async () => {
  let session = { user: { id: 'A' } };
  const values = new Map([['tikliveTTS_v1', '{"voice":"a"}']]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = {};
  let source = fs.readFileSync('interfaz/src/nucleo/estado/datos-por-cuenta.js', 'utf8');
  source = source.replace("import { almacenSesion } from './sesion.js';", 'const almacenSesion = { getState: () => globalThis.__session };');
  globalThis.__session = session;
  const data = await import(`data:text/javascript,${encodeURIComponent(source)}`);

  data.migrarDatosLegacy();
  assert.equal(data.get('tikliveTTS_v1'), '{"voice":"a"}');
  assert.equal(values.has('tikliveTTS_v1'), false);
  session = { user: { id: 'B' } };
  globalThis.__session = session;
  assert.equal(data.get('tikliveTTS_v1'), null);
  data.set('tikliveTTS_v1', '{"voice":"b"}');
  session = { user: { id: 'A' } };
  globalThis.__session = session;
  assert.equal(data.get('tikliveTTS_v1'), '{"voice":"a"}');
});
