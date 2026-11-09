'use strict';

// live-status/live-monitor.js: fin del directo en Twitch/Kick/YouTube. Sin red
// ni timers reales: `check` es falso y las rondas se disparan a mano
// (monitor.chequear). Lo que se fija: la regla de los 3 minutos (3 offline
// SEGUIDOS), que un fallo de la consulta no corte nada, y las carreras.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEventBus } = require('../core/event-bus');
const { crearMonitorEnVivo } = require('../features/canales/live-status/live-monitor');

const settle = () => new Promise((r) => setImmediate(r));

function setup() {
  const logger = { log() {} };
  const bus = createEventBus(logger);
  const respuestas = [];
  const llamadas = [];
  let pendiente = null; // si se setea, el proximo check espera esta promesa
  const check = async (platform, channel) => {
    llamadas.push(`${platform}:${channel}`);
    if (pendiente) return pendiente;
    return respuestas.length ? respuestas.shift() : null;
  };
  const monitor = crearMonitorEnVivo({ bus, logger, check, intervalMs: 3_600_000, fallosParaCortar: 3 });
  const emitidos = [];
  bus.on('canal:live', (p) => emitidos.push(`${p.platform}:${p.channel}:${p.live}`));
  const estado = (platform, channel, state) => bus.emit('canal:estado', { platform, channel, state });
  return {
    monitor, respuestas, llamadas, emitidos, estado,
    setPendiente: (p) => { pendiente = p; },
    async conectar(platform = 'twitch', channel = 'ana') { estado(platform, channel, 'conectado'); await settle(); },
    async ronda(platform = 'twitch', channel = 'ana') { await monitor.chequear(`${platform}:${channel}`); },
  };
}

test('en vivo al conectar: emite live=true una sola vez', async () => {
  const t = setup();
  t.respuestas.push(true, true, true);
  await t.conectar();
  await t.ronda();
  await t.ronda();
  assert.deepEqual(t.emitidos, ['twitch:ana:true']);
  t.monitor.stop();
});

test('regla de los 3 minutos: en vivo, 2 offline seguidos NO cortan; el 3ro SI', async () => {
  const t = setup();
  t.respuestas.push(true, false, false, false);
  await t.conectar();           // true
  await t.ronda();              // false (1)
  await t.ronda();              // false (2)
  assert.deepEqual(t.emitidos, ['twitch:ana:true']);
  await t.ronda();              // false (3) -> corta
  assert.deepEqual(t.emitidos, ['twitch:ana:true', 'twitch:ana:false']);
  t.monitor.stop();
});

test('un "en vivo" en el medio reinicia la cuenta (stream que se reinicio)', async () => {
  const t = setup();
  t.respuestas.push(true, false, false, true, false, false);
  await t.conectar();
  for (let i = 0; i < 5; i++) await t.ronda();
  assert.deepEqual(t.emitidos, ['twitch:ana:true'], 'nunca llego a 3 offline seguidos');
  t.monitor.stop();
});

test('fallos de la consulta (null) no cambian nada, ni cortan ni cuentan', async () => {
  const t = setup();
  t.respuestas.push(true, false, false); // 2 offline...
  await t.conectar();
  await t.ronda();
  await t.ronda();
  for (let i = 0; i < 10; i++) { t.respuestas.push(null); await t.ronda(); } // ...y muchos "no se"
  assert.deepEqual(t.emitidos, ['twitch:ana:true'], 'sigue en vivo');
  t.respuestas.push(false);
  await t.ronda(); // el 3ro offline CONFIRMADO (los null no contaron ni reiniciaron)
  assert.deepEqual(t.emitidos, ['twitch:ana:true', 'twitch:ana:false']);
  t.monitor.stop();
});

test('abre la app antes del stream: offline al conectar -> false de entrada, luego true al empezar', async () => {
  const t = setup();
  t.respuestas.push(false, true);
  await t.conectar();
  assert.deepEqual(t.emitidos, ['twitch:ana:false'], 'no hace falta esperar 3 si nunca estuvo en vivo');
  await t.ronda();
  assert.deepEqual(t.emitidos, ['twitch:ana:false', 'twitch:ana:true']);
  t.monitor.stop();
});

test('sin veredicto al conectar (null) no emite; el primer offline confirmado si', async () => {
  const t = setup();
  t.respuestas.push(null, false);
  await t.conectar();
  assert.deepEqual(t.emitidos, []);
  await t.ronda();
  assert.deepEqual(t.emitidos, ['twitch:ana:false']);
  t.monitor.stop();
});

test('desconectar frena el monitoreo y una respuesta tardia se ignora', async () => {
  const t = setup();
  let resolver;
  t.setPendiente(new Promise((r) => { resolver = r; }));
  t.estado('kick', 'bob', 'conectado');
  await settle();
  t.estado('kick', 'bob', 'desconectado');
  resolver(true); // la respuesta llega despues de desconectar
  await settle();
  assert.deepEqual(t.emitidos, []);
  assert.equal(t.monitor._entradas.size, 0);
  t.monitor.stop();
});

test('no se pisan rondas: con una consulta en curso, otra ronda no dispara una segunda', async () => {
  const t = setup();
  let resolver;
  t.setPendiente(new Promise((r) => { resolver = r; }));
  t.estado('twitch', 'ana', 'conectado'); // arranca la 1ra consulta (queda colgada)
  await settle();
  await t.ronda(); // mientras tanto
  assert.equal(t.llamadas.length, 1);
  resolver(true);
  await settle();
  t.monitor.stop();
});

test('reconexion del chat sin baja no duplica el monitoreo', async () => {
  const t = setup();
  t.respuestas.push(true);
  await t.conectar();
  await t.conectar();
  assert.equal(t.llamadas.length, 1);
  assert.equal(t.monitor._entradas.size, 1);
  t.monitor.stop();
});

test('TikTok, OBS y canales sin nombre no se monitorean (TikTok avisa el fin por su cuenta)', async () => {
  const t = setup();
  t.estado('tiktok', 'ana', 'conectado');
  t.estado('obs', null, 'conectado');
  t.estado('twitch', null, 'conectado');
  await settle();
  assert.equal(t.llamadas.length, 0);
  t.monitor.stop();
});

test('un check que lanza se trata como "no se"', async () => {
  const logger = { log() {} };
  const bus = createEventBus(logger);
  const emitidos = [];
  bus.on('canal:live', (p) => emitidos.push(p.live));
  const monitor = crearMonitorEnVivo({ bus, logger, check: async () => { throw new Error('boom'); }, intervalMs: 3_600_000 });
  bus.emit('canal:estado', { platform: 'kick', channel: 'bob', state: 'conectado' });
  await settle();
  assert.deepEqual(emitidos, []);
  monitor.stop();
});
