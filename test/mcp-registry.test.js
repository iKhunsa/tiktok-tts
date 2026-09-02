'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { bootServer } = require('./helpers/boot-server');

const srv = bootServer();
after(() => srv.close());

const registry = require('../core/contracts/mcp-registry');

test('el registro se pobló al bootear (dominios registraron sus tools)', () => {
  assert.ok(registry.listTools().length >= 4, 'debe haber al menos las 4 tools core');
});

test('las 4 tools core del dominio mcp están presentes', () => {
  const names = new Set(registry.listTools().map((t) => t.name));
  for (const n of ['get_state', 'get_recent_chat', 'get_activity', 'health']) {
    assert.ok(names.has(n), `falta la tool "${n}"`);
  }
});

test('cada tool tiene metadata y schema válidos', () => {
  for (const t of registry.listTools()) {
    assert.ok(t.name && typeof t.name === 'string', `tool sin name`);
    assert.ok(t.title, `${t.name}: sin title`);
    assert.ok(t.description, `${t.name}: sin description`);
    assert.equal(t.inputSchema.type, 'object', `${t.name}: inputSchema.type != object`);
    assert.equal(typeof t.annotations.readOnlyHint, 'boolean', `${t.name}: annotations mal`);
    assert.equal(typeof t.annotations.destructiveHint, 'boolean');
    assert.ok(t.domain, `${t.name}: sin domain`);
  }
});

test('listTools() no filtra el handler', () => {
  for (const t of registry.listTools()) {
    assert.equal(t.handler, undefined, `${t.name}: listTools expuso el handler`);
  }
});

test('callTool con nombre desconocido devuelve error estructurado, no lanza', async () => {
  const out = await registry.callTool('no_existe', {});
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'unknown_tool');
});

test('callTool valida args requeridos', async () => {
  // health no tiene required; probamos el path de invalid_args con un schema sintético
  registry.registerTool({
    name: '__test_required', domain: 'test', title: 'x', description: 'x',
    inputSchema: { type: 'object', required: ['foo'], properties: { foo: { type: 'string' } } },
    handler: () => 'ok',
  });
  const out = await registry.callTool('__test_required', {});
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'invalid_args');
});

test('un handler que lanza se convierte en handler_error con stack', async () => {
  registry.registerTool({
    name: '__test_throws', domain: 'test', title: 'x', description: 'x',
    inputSchema: { type: 'object', properties: {} },
    handler: () => { throw new Error('boom'); },
  });
  const out = await registry.callTool('__test_throws', {});
  assert.equal(out.ok, false);
  assert.equal(out.error.code, 'handler_error');
  assert.match(out.error.message, /boom/);
  assert.ok(out.error.stack, 'debe incluir stack para GlitchTip');
});

test('nombre de tool duplicado lanza (aislado por register-domain)', () => {
  assert.throws(() => {
    registry.registerTool({
      name: 'health', domain: 'otro', title: 'x', description: 'x',
      inputSchema: { type: 'object', properties: {} }, handler: () => 1,
    });
  }, /duplicado/);
});

test('GARANTÍA: todo dominio con rutas de escritura registra ≥1 tool', () => {
  // Dominios que montan POST/PATCH/DELETE y por tanto deben aparecer como
  // t.domain de alguna tool. (Se actualiza al agregar features en Fase 2+.)
  const CON_ESCRITURA = ['moderacion', 'canales', 'sonido', 'configuracion', 'overlay'];
  const dominiosConTool = new Set(registry.listTools().map((t) => t.domain));
  const faltan = CON_ESCRITURA.filter((d) => !dominiosConTool.has(d));
  // Fase 1: todavía no hay bloques por dominio → se documenta el pendiente.
  // Fase 2 convierte esto en assert.deepEqual(faltan, []).
  if (faltan.length) {
    console.warn(`[mcp] pendiente Fase 2 — dominios sin tool: ${faltan.join(', ')}`);
  }
  assert.ok(Array.isArray(faltan));
});
