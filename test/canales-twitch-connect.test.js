'use strict';

// GlitchTip #63: connectTwitch pasaba `identity` con el token OAuth (de EventSub,
// caduca sin refresh en este path). Token vencido -> tmi.js rechaza connect() con
// el STRING "Login unsuccessful" -> el chat entero se caia y reintentaba 5x con
// el token muerto, logueando "Fallo reconexion de Twitch <chan>: undefined"
// (err.message de un string es undefined).
//
// Fix: cliente SIEMPRE anonimo (es solo-lectura) + normalizar el string-reject
// a Error antes de propagarlo.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const TMI_PATH = require.resolve('tmi.js');
const CT_PATH = require.resolve('../features/canales/twitch/connect-twitch');

// Stub de tmi.js via require.cache — connect-twitch.js hace require('tmi.js')
// lazily dentro de la funcion, asi que basta con sembrar la cache.
async function withStubTmi(connectImpl, run) {
  const prev = require.cache[TMI_PATH];
  const instances = [];
  const optsSeen = [];
  class FakeClient extends EventEmitter {
    constructor(opts) { super(); optsSeen.push(opts); instances.push(this); }
    connect() { return connectImpl(this, instances.length - 1); }
    disconnect() { return Promise.resolve(); }
  }
  require.cache[TMI_PATH] = {
    id: TMI_PATH, filename: TMI_PATH, loaded: true,
    exports: { Client: FakeClient, client: FakeClient },
  };
  delete require.cache[CT_PATH];
  try {
    const { connectTwitch } = require(CT_PATH);
    return await run(connectTwitch, { optsSeen, instances });
  } finally {
    if (prev) require.cache[TMI_PATH] = prev; else delete require.cache[TMI_PATH];
    delete require.cache[CT_PATH];
  }
}

function deps() {
  const { createChannelState } = require('../features/canales/state/channel-maps');
  const { createStubLogger } = require('./helpers/stub-logger');
  const state = createChannelState();
  state.authTokens.twitch = { login: 'bot', accessToken: 'expirado', expiresAt: 0 };
  return { state, bus: new EventEmitter(), logger: createStubLogger() };
}

test('el cliente tmi.js se crea SIEMPRE anonimo — nunca con identity', async () => {
  await withStubTmi(
    () => Promise.resolve(['irc-ws.chat.twitch.tv', 6667]),
    async (connectTwitch, { optsSeen }) => {
      const d = deps();
      await connectTwitch(d, 'kintsu99');
      assert.equal(optsSeen.length, 1);
      assert.deepEqual(optsSeen[0].channels, ['kintsu99']);
      assert.equal(optsSeen[0].identity, undefined, 'sin identity pese al token guardado');
    }
  );
});

test('connect() que rechaza con un string se propaga como Error con message real', async () => {
  await withStubTmi(
    () => Promise.reject('Login unsuccessful'),
    async (connectTwitch) => {
      await assert.rejects(connectTwitch(deps(), 'kintsu99'), (err) => {
        assert.ok(err instanceof Error, 'es Error, no string');
        assert.equal(err.message, 'Login unsuccessful');
        return true;
      });
    }
  );
});

test('reconexion tras disconnect: el log trae el motivo real, nunca "undefined"', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withStubTmi(
    // 1er connect (inicial) OK; el retry rechaza con un string
    (_client, idx) => (idx === 0
      ? Promise.resolve(['irc-ws.chat.twitch.tv', 6667])
      : Promise.reject('Unable to connect.')),
    async (connectTwitch, { instances }) => {
      const d = deps();
      await connectTwitch(d, 'kintsu99');

      instances[0].emit('disconnected');        // agenda retry con setTimeout(1000)
      assert.ok(d.state.twitchReconnectTimers.has('kintsu99'), 'retry agendado');
      t.mock.timers.tick(1000);                 // dispara el callback del retry
      for (let i = 0; i < 10; i++) await Promise.resolve(); // flush del reject async

      const fail = d.logger.entries.find((e) => e.event === 'canales.twitch.reconexion_fallida');
      assert.ok(fail, 'se logueo reconexion_fallida');
      assert.equal(fail.data.error, 'Unable to connect.');
      assert.ok(!fail.message.includes('undefined'), fail.message);
    }
  );
});
