'use strict';

// Telemetria de TikTok TTS.
//
//   const telemetry = require('./telemetry');
//   telemetry.bus.emit('tts:spoken', { lang: 'es-MX' });   // desde server.js
//   telemetry.init({ url, appVersion, dataDir });          // desde main.js
//
// Si no hay URL configurada, `init` no arranca nada y `bus.emit` es un no-op
// barato: la app no hace ni una sola peticion de red.
//
// Los conectores traducen los eventos internos del bus a eventos de
// telemetria. Anadir metrica nueva = tocar un conector, no el transporte.

const { EventEmitter } = require('events');

const { machineId, sessionId, osInfo } = require('./identity');
const { Buffer } = require('./buffer');
const { Transport } = require('./transport');
const { CreatorCache } = require('./creator-cache');

const HEARTBEAT_MS = 5 * 60 * 1000;

// Bus interno. Existe siempre, aunque la telemetria este desactivada, para que
// server.js pueda emitir sin comprobar nada.
const bus = new EventEmitter();
bus.setMaxListeners(50);

const runtime = {
  enabled: false,
  startedAt: Date.now(),
  buffer: null,
  transport: null,
  creators: null,
  heartbeatTimer: null,
  flushTimer: null,
  identity: null,
  platformsUsed: new Set(),
};

function track(connector, name, props = {}) {
  if (!runtime.enabled) return;
  runtime.buffer.push({
    connector,
    name,
    ts: new Date().toISOString(),
    props,
  });
}

// Acceso a la cache de canales para el conector `creators`.
function creatorCache() {
  return runtime.creators;
}

function platformsUsed() {
  return [...runtime.platformsUsed];
}

function markPlatform(platform) {
  if (platform) runtime.platformsUsed.add(platform);
}

function sessionMinutes() {
  return Math.round((Date.now() - runtime.startedAt) / 60000);
}

function init({ url, appVersion, dataDir }) {
  if (runtime.enabled) return true;
  if (!url) return false; // sin servidor configurado: telemetria desactivada

  try {
    runtime.identity = {
      machineId: machineId(),
      sessionId: sessionId(),
      os: osInfo(),
    };
    runtime.buffer = new Buffer(dataDir);
    runtime.creators = new CreatorCache(dataDir);
    runtime.transport = new Transport({
      url,
      buffer: runtime.buffer,
      identity: runtime.identity,
      appVersion,
      onDirectives: handleDirectives,
    });
    runtime.enabled = true;
  } catch (err) {
    console.error('[telemetry] no se pudo inicializar:', err.message);
    return false;
  }

  // Los conectores se enganchan al bus una vez que track() ya funciona.
  for (const connector of require('./connectors')) {
    try {
      connector.attach(bus, track, { creatorCache, platformsUsed, markPlatform });
    } catch (err) {
      console.error(`[telemetry] conector ${connector.name} fallo al engancharse:`, err.message);
    }
  }

  track('app', 'startup', { locale: runtime.identity.os.locale });

  runtime.heartbeatTimer = setInterval(() => {
    bus.emit('telemetry:heartbeat');
    track('app', 'heartbeat', {});
    flush();
  }, HEARTBEAT_MS);
  if (runtime.heartbeatTimer.unref) runtime.heartbeatTimer.unref();

  // Un envio temprano para que la instalacion aparezca en el panel enseguida,
  // sin esperar los 5 minutos del primer latido.
  runtime.flushTimer = setTimeout(flush, 15000);
  if (runtime.flushTimer.unref) runtime.flushTimer.unref();

  return true;
}

// Directivas que devuelve el servidor en la respuesta del ingest.
function handleDirectives(directives) {
  if (!directives || !Array.isArray(directives.re_resolve)) return;
  for (const { platform, username } of directives.re_resolve) {
    if (platform && username) runtime.creators.forceReResolve(platform, username);
  }
}

function flush(options) {
  if (!runtime.enabled) return Promise.resolve(true);
  return runtime.transport.flush(options).catch(() => false);
}

// Cierre limpio. Se llama desde `before-quit` con el quit pospuesto, porque en
// `will-quit` el proceso muere antes de que salga la peticion — el motivo por
// el que el evento de cierre nunca llegaba en la version anterior.
async function shutdown({ timeoutMs = 1500 } = {}) {
  if (!runtime.enabled) return;

  clearInterval(runtime.heartbeatTimer);
  clearTimeout(runtime.flushTimer);

  bus.emit('telemetry:heartbeat'); // vacia los contadores acumulados
  track('app', 'shutdown', {
    duration_minutes: sessionMinutes(),
    platforms_used: platformsUsed(),
  });

  // Si no da tiempo, los eventos quedan en disco y salen al proximo arranque.
  await flush({ timeoutMs, retries: 0 });
  runtime.buffer.persist();
}

module.exports = {
  bus,
  init,
  track,
  flush,
  shutdown,
  creatorCache,
  markPlatform,
  platformsUsed,
  sessionMinutes,
  get enabled() { return runtime.enabled; },
};
