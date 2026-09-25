'use strict';

// Supervisor de continuidad de TikTok (features/canales/tiktok/connect-tiktok-channel.js):
// mientras la intencion del usuario siga activa (la entrada existe en
// state.tiktokChannels), una falla tecnica o un estado ambiguo NUNCA borra el
// canal ni exige volver a pulsar "Conectar" — solo "Desconectar" (o quitar el
// canal, o cerrar la app) lo hace. Ver Docu 2/ para el pedido completo.
//
// @tiklivetts/tiktok-live-client abre una BrowserWindow real — bajo `node`
// plano no se puede instanciar. Se stubea via require.cache (mismo patron
// que test/canales-twitch-connect.test.js con tmi.js) para poder controlar
// determinísticamente cada resultado de connect() sin Electron.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const TTLC_PATH = require.resolve('@tiklivetts/tiktok-live-client');
const CTC_PATH = require.resolve('../features/canales/tiktok/connect-tiktok-channel');
const { nextRetryDelayMs, nextWaitingLiveDelayMs, RECOVERY_VISIBLE_THRESHOLD_MS } = require('../features/canales/tiktok/tiktok-supervisor-schedule');

class FakeNotLiveError extends Error {
  constructor() { super("The requested user isn't online :("); this.name = 'NotLiveError'; this.code = 'NOT_LIVE'; this.confirmed = false; }
}
class FakeUnknownError extends Error {
  constructor(reason = 'unexpected_shape') { super(`unknown (${reason})`); this.name = 'LiveStatusUnknownError'; this.code = 'LIVE_STATUS_UNKNOWN'; this.reason = reason; }
}

class FakeAuthRequiredError extends Error {
  constructor() { super('TikTok requires login to open @ana/live'); this.name = 'AuthRequiredError'; this.code = 'AUTH_REQUIRED'; }
}

/** connectImpl(instance, attemptIndex0Based) -> valor de resolucion, o lanza/rechaza para simular un fallo. */
async function withFakeTiktok(connectImpl, run) {
  const prev = require.cache[TTLC_PATH];
  const instances = [];
  class FakeClient extends EventEmitter {
    constructor(username) { super(); this.username = username; this.disconnectedManually = false; instances.push(this); }
    async connect() { return connectImpl(this, instances.length - 1); }
    disconnect() { this.disconnectedManually = true; }
  }
  require.cache[TTLC_PATH] = {
    id: TTLC_PATH, filename: TTLC_PATH, loaded: true,
    exports: { TikTokLiveClient: FakeClient, SigningError: class SigningError extends Error {}, NotLiveError: FakeNotLiveError, LiveStatusUnknownError: FakeUnknownError },
  };
  delete require.cache[CTC_PATH];
  try {
    const mod = require(CTC_PATH);
    return await run(mod, instances);
  } finally {
    if (prev) require.cache[TTLC_PATH] = prev; else delete require.cache[TTLC_PATH];
    delete require.cache[CTC_PATH];
  }
}

function makeDeps() {
  const { createChannelState } = require('../features/canales/state/channel-maps');
  const { createStubLogger } = require('./helpers/stub-logger');
  const state = createChannelState();
  const bus = new EventEmitter();
  const estados = [];
  bus.on('canal:estado', (p) => estados.push(p));
  const broadcasts = [];
  bus.on('ws:broadcast', (p) => broadcasts.push(p));
  return { deps: { state, bus, logger: createStubLogger() }, estados, broadcasts };
}

async function flush(n = 10) {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

test('estado ambiguo inicial seguido por conexion exitosa: no borra la intencion, reintenta y conecta', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? Promise.reject(new FakeUnknownError('unexpected_shape')) : { roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps, estados } = makeDeps();

      await assert.rejects(connectTiktokChannel(deps, 'ana'), (err) => {
        assert.equal(err.code, 'LIVE_STATUS_UNKNOWN');
        return true;
      });

      const entry = deps.state.tiktokChannels.get('ana');
      assert.ok(entry, 'la intencion se conserva pese al primer intento ambiguo');
      assert.equal(entry.techState, 'connecting');
      assert.equal(instances.length, 1);

      t.mock.timers.tick(nextRetryDelayMs(1));
      await flush();

      assert.equal(instances.length, 2, 'se agendo un segundo intento');
      const finalEntry = deps.state.tiktokChannels.get('ana');
      assert.equal(finalEntry.techState, 'connected');
      assert.equal(finalEntry.connectedOnce, true);
      assert.ok(estados.some((p) => p.state === 'conectado' && p.recovered === false), 'conectado sin marcar como recuperacion (nunca hubo conexion previa)');
    }
  );
});

test('caida tecnica tras una conexion exitosa: recupera solo, muestra "restaurando" y "restablecida"', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => {
      if (idx === 0) return { roomInfo: { status: 2 } }; // conexion inicial OK
      if (idx === 1 || idx === 2) return Promise.reject(new FakeUnknownError('body_fetch_failed')); // 2 fallos de recuperacion
      return { roomInfo: { status: 2 } }; // el 3er intento de recuperacion conecta
    },
    async ({ connectTiktokChannel }, instances) => {
      const { deps, estados, broadcasts } = makeDeps();
      await connectTiktokChannel(deps, 'ana');
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected');

      instances[0].emit('disconnected'); // caida real
      await flush();
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'recovering');

      t.mock.timers.tick(nextRetryDelayMs(1)); // dispara intento de recuperacion #1 (falla)
      await flush();
      t.mock.timers.tick(RECOVERY_VISIBLE_THRESHOLD_MS - nextRetryDelayMs(1)); // cruza el umbral de "visible"
      await flush();
      assert.ok(broadcasts.some((b) => b.type === 'tiktok-connection-status' && b.status === 'restoring'), 'se mostro "Restaurando..." tras cruzar el umbral');

      t.mock.timers.tick(nextRetryDelayMs(2)); // dispara intento de recuperacion #2 (conecta)
      await flush();

      const entry = deps.state.tiktokChannels.get('ana');
      assert.equal(entry.techState, 'connected');
      assert.equal(entry.consecutiveFailures, 0, 'el contador se resetea al reconectar');
      assert.ok(estados.some((p) => p.state === 'conectado' && p.recovered === true), 'canal:estado marca la reconexion como recuperacion visible');
      assert.ok(broadcasts.some((b) => b.type === 'tiktok-connection-status' && b.status === 'connected' && b.recovered === true), '"restablecida" se muestra solo porque la interrupcion fue visible');
    }
  );
});

test('live silencioso (sin chat) sigue sano: cualquier senal tecnica rearma el watchdog', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    () => ({ roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');

      const key = 'tiktok:ana';
      const firstTimer = deps.state.channelWatchdogTimers.get(key);
      assert.ok(firstTimer, 'el watchdog se armo al conectar, sin necesidad de chat');

      // Ni un solo mensaje de chat, regalo o viewer — solo el push periodico
      // de viewerCount que TikTok manda igual con la sala en silencio.
      instances[0].emit('roomUserSeq', { viewerCount: 3 });
      const secondTimer = deps.state.channelWatchdogTimers.get(key);
      assert.notEqual(secondTimer, firstTimer, 'roomUserSeq por si solo ya rearma el watchdog');

      t.mock.timers.tick(4 * 60 * 1000); // bien antes de los 5 min, nunca deberia dispararse
      await flush();
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected', 'un live silencioso nunca se trata como caido');
    }
  );
});

test('dos senales: check_alive vigente evita reconectar un live sin eventos; si deja de confirmar, recupera', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  await withFakeTiktok(
    () => ({ roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');
      const events = () => deps.logger.entries.map((e) => e.event);

      // 5 min sin NINGUN evento tecnico, pero check_alive confirmando cada 6s.
      for (let i = 0; i < 50; i++) { t.mock.timers.tick(6000); instances[0].emit('checkAlive'); }
      await flush();
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected', 'check_alive vigente: no reconecta');
      assert.ok(events().includes('canales.tiktok.sano_sin_actividad'));
      assert.equal(instances.length, 1, 'no se abrio un intento nuevo');

      // Sigue sano mientras check_alive confirme (re-chequeo periodico).
      for (let i = 0; i < 30; i++) { t.mock.timers.tick(6000); instances[0].emit('checkAlive'); }
      await flush();
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected');

      // check_alive deja de llegar: al vencer la ventana de frescura, recupera.
      t.mock.timers.tick(2 * 60 * 1000);
      await flush();
      const stale = deps.logger.entries.find((e) => e.event === 'canales.tiktok.sin_eventos');
      assert.ok(stale, 'se logueo la muerte real');
      assert.equal(stale.data.healthSignal, 'check_alive_dejo_de_confirmar');
      assert.equal(instances.length, 2, 'se disparo la recuperacion');
    }
  );
});

test('sin check_alive el watchdog general sigue reconectando a los 5 min (comportamiento previo intacto)', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  await withFakeTiktok(
    () => ({ roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');
      t.mock.timers.tick(5 * 60 * 1000);
      await flush();
      const stale = deps.logger.entries.find((e) => e.event === 'canales.tiktok.sin_eventos');
      assert.equal(stale.data.healthSignal, 'ninguna_en_ventana');
      assert.equal(instances.length, 2);
    }
  );
});

test('Desconectar durante recuperacion cancela el reintento agendado de inmediato', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? { roomInfo: { status: 2 } } : Promise.reject(new FakeUnknownError('empty_body'))),
    async ({ connectTiktokChannel, teardownConn }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');

      instances[0].emit('disconnected');
      await flush();
      const entry = deps.state.tiktokChannels.get('ana');
      assert.equal(entry.techState, 'recovering');
      assert.ok(entry.timer, 'hay un reintento agendado');

      // Mismo patron que routes/disconnect.js
      teardownConn(entry);
      deps.state.tiktokChannels.delete('ana');

      t.mock.timers.tick(60000);
      await flush();

      assert.equal(instances.length, 2, 'ningun intento nuevo se disparo tras Desconectar');
      assert.equal(deps.state.tiktokChannels.has('ana'), false, 'la intencion quedo eliminada por Desconectar, no por la falla tecnica');
    }
  );
});

test('un clic de Conectar durante una recuperacion en curso nunca deja dos intentos activos', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? { roomInfo: { status: 2 } } : idx === 1 ? Promise.reject(new FakeUnknownError()) : { roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');

      instances[0].emit('disconnected');
      await flush(); // intento de recuperacion #1 (instances[1]) falla y agenda otro en nextRetryDelayMs(1)

      const staleTimerCountBefore = instances.length;
      await connectTiktokChannel(deps, 'ana'); // el usuario clickea "Conectar" de nuevo (instances[2], exitoso)

      // El reintento viejo agendado por la recuperacion NUNCA debe disparar
      // otro intento — connectTiktokChannel ya lo cancelo al pisar la entrada.
      t.mock.timers.tick(60000);
      await flush();

      assert.equal(instances.length, staleTimerCountBefore + 1, 'el clic manual creo un solo intento nuevo, el timer viejo no disparo otro');
      assert.equal(deps.state.tiktokChannels.get('ana').conn, instances[instances.length - 1], 'solo el conn mas nuevo queda activo');
    }
  );
});

test('tras recuperar, una conexion vieja no puede seguir procesando eventos (dedup)', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? { roomInfo: { status: 2 } } : { roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');
      const oldConn = instances[0];
      assert.equal(oldConn.listenerCount('chat'), 1, 'la conexion original tenia su listener de chat');

      instances[0].emit('disconnected'); // fuerza una recuperacion -> conn nuevo
      await flush();

      // teardownConnResources ya corrio removeAllListeners() sobre la
      // conexion vieja al reemplazarla — es la garantia real de deduplicacion
      // (una conexion sin listeners no puede volver a emitir nada, sin
      // depender de que el codigo revise la identidad "a mano" en cada evento).
      assert.equal(oldConn.listenerCount('chat'), 0, 'la conexion vieja se quedo sin listeners tras la recuperacion');

      const crudos = [];
      deps.bus.on('canal:mensaje-crudo', (m) => crudos.push(m));
      oldConn.emit('chat', { comment: 'mensaje fantasma de la conexion vieja' }); // no-op: sin listeners
      assert.equal(crudos.length, 0, 'el evento de la conexion vieja no llega a ningun lado');

      // La conexion NUEVA (la que reemplazo a la vieja) sigue procesando bien.
      const newConn = deps.state.tiktokChannels.get('ana').conn;
      assert.notEqual(newConn, oldConn);
      newConn.emit('chat', { comment: 'mensaje real' });
      assert.equal(crudos.length, 1, 'la conexion nueva si procesa sus propios eventos');
    }
  );
});

test('offline confirmado entra en espera sin borrar la intencion, y reintenta mas lento', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? Promise.reject(new FakeNotLiveError()) : Promise.reject(new FakeNotLiveError())),
    async ({ connectTiktokChannel }, instances) => {
      const { deps, estados } = makeDeps();

      await assert.rejects(connectTiktokChannel(deps, 'ana'), (err) => {
        assert.equal(err.code, 'NOT_LIVE');
        return true;
      });

      const entry = deps.state.tiktokChannels.get('ana');
      assert.ok(entry, 'la intencion se conserva pese a la confirmacion de offline');
      assert.equal(entry.techState, 'waiting_live');
      assert.ok(estados.some((p) => p.state === 'esperando-proximo-live'));

      t.mock.timers.tick(nextWaitingLiveDelayMs(0));
      await flush();
      assert.equal(instances.length, 2, 'siguio esperando el proximo live, sin que el usuario haga nada');
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'waiting_live');
    }
  );
});

test('TikTok pide login: auth_required, sin retry infinito, y reanuda solo tras resumeAuthPausedChannels', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    (_i, idx) => (idx === 0 ? Promise.reject(new FakeAuthRequiredError()) : { roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel, resumeAuthPausedChannels }, instances) => {
      const { deps, estados, broadcasts } = makeDeps();

      await assert.rejects(connectTiktokChannel(deps, 'ana'), (err) => {
        assert.equal(err.code, 'AUTH_REQUIRED', 'nunca cae al bucket unknown');
        return true;
      });

      const entry = deps.state.tiktokChannels.get('ana');
      assert.ok(entry, 'la intencion se conserva');
      assert.equal(entry.techState, 'auth_required');
      assert.equal(entry.timer, null, 'supervisor pausado: no hay proximo intento agendado');
      assert.ok(estados.some((p) => p.state === 'auth-requerida' && p.channel === 'ana'));
      assert.ok(broadcasts.some((b) => b.type === 'tiktok-connection-status' && b.status === 'auth-required' && b.channel === 'ana'));

      t.mock.timers.tick(10 * 60 * 1000);
      await flush();
      assert.equal(instances.length, 1, 'ni un reintento mientras no haya sesion');

      assert.deepEqual(resumeAuthPausedChannels(deps, 'login'), ['ana']);
      await flush();
      assert.equal(instances.length, 2, 'reanudo sola tras el login');
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected');
      assert.ok(estados.some((p) => p.state === 'sesion-restaurada' && p.channel === 'ana'));
    }
  );
});

test('error real (unknown) sigue reintentando con backoff aunque exista el bucket auth_required', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    () => Promise.reject(new Error("ERR_ABORTED (-3) loading 'https://www.tiktok.com/@ana/live'")),
    async ({ connectTiktokChannel, resumeAuthPausedChannels }, instances) => {
      const { deps } = makeDeps();
      await assert.rejects(connectTiktokChannel(deps, 'ana'));
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connecting');
      assert.deepEqual(resumeAuthPausedChannels(deps, 'login'), [], 'un unknown no es un canal pausado por auth');
      t.mock.timers.tick(nextRetryDelayMs(1));
      await flush();
      assert.equal(instances.length, 2, 'el backoff existente sigue intacto');
    }
  );
});

test('fallo con tiktokStatusCode persistente (ej. 30003) converge al ritmo lento de espera, no al cap de 60s', () => {
  const burst = 4;
  for (let n = 1; n <= burst; n++) {
    assert.equal(nextRetryDelayMs(n, { tiktokAnswered: true }), nextRetryDelayMs(n), 'la rafaga rapida inicial no cambia');
  }
  assert.equal(nextRetryDelayMs(burst + 1, { tiktokAnswered: true }), nextWaitingLiveDelayMs(0));
  assert.equal(nextRetryDelayMs(100, { tiktokAnswered: true }), nextWaitingLiveDelayMs(100));
  assert.ok(nextRetryDelayMs(100, { tiktokAnswered: true }) > nextRetryDelayMs(100), 'mas lento que el backoff de fallo tecnico');
});

test('roomChanged (la pagina salto a otro directo) dispara una recuperacion y reentra al canal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withFakeTiktok(
    () => ({ roomInfo: { status: 2 } }),
    async ({ connectTiktokChannel }, instances) => {
      const { deps } = makeDeps();
      await connectTiktokChannel(deps, 'ana');

      instances[0].emit('roomChanged', { roomId: '1', newRoomId: '2' });
      await flush();

      assert.equal(instances.length, 2, 'se abrio una conexion nueva al canal pedido');
      assert.equal(instances[0].disconnectedManually, true, 'la conexion de la sala equivocada se cerro');
      assert.equal(deps.state.tiktokChannels.get('ana').techState, 'connected');
    }
  );
});
