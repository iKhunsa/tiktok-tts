'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const overlay = require('../features/overlay');
const mcpRegistry = require('../core/contracts/mcp-registry');

// Regresion GlitchTip #76: un timer de 5 min pedia `conn.fetchRoomInfo()`, que
// el cliente TikTok propio no expone. La base sale solo del roomInfo al conectar
// y los follows en vivo suman aparte; no debe quedar ningun refresco periodico.
test('la base de followers se fija al conectar y no se refresca periodicamente', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const emitted = [];
  const listeners = new Map();
  const bus = {
    on: (event, fn) => listeners.set(event, [...(listeners.get(event) || []), fn]),
    emit: (event, payload) => {
      emitted.push(event);
      for (const fn of listeners.get(event) || []) fn(payload);
    },
  };
  const app = { use() {}, get() {}, post() {}, delete() {} };
  overlay.register({ app, bus, logger: { log() {} } });

  const roomInfo = { owner: { follow_info: { follower_count: 1619 } } };
  bus.emit('canal:estado', { platform: 'tiktok', channel: 'adriamwill', state: 'conectado', roomInfo });
  bus.emit('canal:follow', { platform: 'tiktok', nick: 'nuevo', userId: '1' });
  t.mock.timers.tick(15 * 60 * 1000);

  assert.ok(!emitted.includes('canales:refrescar-followers'));
  const { result } = await mcpRegistry.callTool('overlay_stats', {});
  assert.equal(result.baseFollowerCount, 1619);
  assert.equal(result.followCount, 1);
});
