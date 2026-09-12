'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createChannelState } = require('../features/canales/state/channel-maps');
const { createStubLogger } = require('./helpers/stub-logger');

async function withClient(connectImpl, run) {
  const pkgPath = require.resolve('@tiklivetts/tiktok-live-client');
  const modulePath = require.resolve('../features/canales/tiktok/connect-tiktok-channel');
  const prior = require.cache[pkgPath];
  class Client extends EventEmitter {
    connect() { return connectImpl(this); }
    disconnect() { this.closed = true; }
  }
  require.cache[pkgPath] = { id: pkgPath, filename: pkgPath, loaded: true, exports: { TikTokLiveClient: Client } };
  delete require.cache[modulePath];
  const api = require(modulePath);
  const deps = { state: createChannelState(), bus: new EventEmitter(), logger: createStubLogger() };
  try { await run(api, deps); } finally {
    for (const entry of deps.state.tiktokChannels.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      api.teardownConn(entry);
    }
    for (const timer of deps.state.channelWatchdogTimers.values()) clearTimeout(timer);
    if (prior) require.cache[pkgPath] = prior; else delete require.cache[pkgPath];
    delete require.cache[modulePath];
  }
}

test('error durante connect no se convierte en HTTP success al borrar la entrada', async () => {
  let client;
  await withClient(async (conn) => {
    client = conn;
    conn.emit('error', new Error('SIGNING_FAILED'));
    throw new Error('SIGNING_FAILED');
  }, async ({ connectTiktokChannel }, deps) => {
    await assert.rejects(connectTiktokChannel(deps, 'ana'), /SIGNING_FAILED/);
    assert.equal(client.closed, true);
    assert.equal(deps.state.tiktokChannels.size, 0);
    assert.equal(deps.state.connectingTiktok.size, 0);
  });
});

test('timeout termina la promesa HTTP aunque el proveedor nunca resuelva connect', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withClient(() => new Promise(() => {}), async ({ connectTiktokChannel }, deps) => {
    let outcome;
    const pending = connectTiktokChannel(deps, 'ana').then(() => { outcome = 'success'; }, (err) => { outcome = err; });
    t.mock.timers.tick(30001);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.ok(outcome instanceof Error, 'la peticion no puede quedar pendiente tras timeout');
    assert.match(outcome.message, /Timeout/i);
    assert.equal(deps.state.tiktokChannels.size, 0);
    await pending;
  });
});

test('likeCount string del protobuf se entrega como numero al acumulador del overlay', async () => {
  await withClient(async () => ({}), async ({ setupTikTokConnection }, deps) => {
    const likes = [];
    deps.bus.on('canal:like', (event) => likes.push(event.likeCount));
    const conn = setupTikTokConnection(deps, 'ana');
    conn.emit('like', { uniqueId: 'viewer', likeCount: '2' });
    conn.emit('like', { uniqueId: 'viewer', likeCount: '3' });
    assert.deepEqual(likes, [2, 3]);
    assert.equal(likes.reduce((a, b) => a + b, 0), 5);
  });
});

test('actividad de sala sin chat rearma watchdog y teardown cancela regalos pendientes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withClient(async () => ({}), async ({ connectTiktokChannel, teardownConn }, deps) => {
    await connectTiktokChannel(deps, 'ana');
    const entry = deps.state.tiktokChannels.get('ana');
    const timer = deps.state.channelWatchdogTimers.get('tiktok:ana');
    entry.conn.emit('roomUserSeq', { viewerCount: 20 });
    assert.notEqual(deps.state.channelWatchdogTimers.get('tiktok:ana'), timer);
    let gifts = 0;
    deps.bus.on('canal:gift', () => gifts++);
    entry.conn.emit('gift', { uniqueId: 'viewer', giftId: '1', groupCount: '2' });
    teardownConn(entry);
    t.mock.timers.tick(1501);
    assert.equal(gifts, 0);
  });
});

test('desconexion del usuario cancela connect pendiente sin devolver exito', async () => {
  await withClient(() => new Promise(() => {}), async ({ connectTiktokChannel }, deps) => {
    const pending = connectTiktokChannel(deps, 'ana');
    const rejected = assert.rejects(pending, /cancelada/);
    require('../features/canales/routes/disconnect').disconnect(deps)({ body: { username: 'ana' } }, { json() {} });
    await rejected;
    assert.equal(deps.state.tiktokChannels.size, 0);
    assert.equal(deps.state.connectingTiktok.size, 0);
  });
});

test('un frame no decodificable no impide que conecte el siguiente frame valido', async () => {
  await withClient(async (conn) => {
    conn.emit('error', Object.assign(new Error('frame desconocido'), { code: 'DECODE_FAILED' }));
    return { roomInfo: { status: 2 } };
  }, async ({ connectTiktokChannel }, deps) => {
    assert.equal(await connectTiktokChannel(deps, 'ana'), 'ana');
    assert.equal(deps.state.tiktokChannels.get('ana').connectedOnce, true);
  });
});
