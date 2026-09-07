'use strict';

// Runtime de telemetria: init()/track()/flush()/shutdown(). Separado de
// index.js (que es el registro del dominio y engancha los conectores al
// bus) porque init() necesita datos que solo /electron-shell tiene
// (app.getVersion(), app.getPath('userData')) — se llama desde ahi, no
// desde register().
const { machineId, sessionId, osInfo } = require('./identity');
const { Buffer } = require('./buffer');
const { Transport } = require('./transport');
const { CreatorCache } = require('./creator-cache');

const HEARTBEAT_MS = 5 * 60 * 1000;

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
  bus: null,
  logger: null,
};

function track(connector, name, props = {}) {
  if (!runtime.enabled) return;
  runtime.buffer.push({ connector, name, ts: new Date().toISOString(), props });
}

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

function init({ url, token, appVersion, dataDir, bus, logger }) {
  if (runtime.enabled) return true;
  if (!url) return false; // sin servidor configurado: telemetria desactivada

  runtime.bus = bus;
  runtime.logger = logger;

  try {
    runtime.identity = { machineId: machineId(), sessionId: sessionId(), os: osInfo() };
    runtime.buffer = new Buffer(dataDir, logger);
    runtime.creators = new CreatorCache(dataDir, logger);
    runtime.transport = new Transport({
      url, token, buffer: runtime.buffer, identity: runtime.identity, appVersion,
      onDirectives: handleDirectives, logger,
    });
    runtime.enabled = true;
  } catch (error) {
    logger.log(
      'error', 'telemetria', 'telemetria/runtime.js#init', 'telemetria.init.fallido',
      `No se pudo inicializar telemetria: ${error.message}`, { error: error.message, stack: error.stack }
    );
    return false;
  }

  track('app', 'startup', { locale: runtime.identity.os.locale });

  runtime.heartbeatTimer = setInterval(() => {
    bus.emit('telemetry:heartbeat');
    track('app', 'heartbeat', {});
    flush();
  }, HEARTBEAT_MS);
  if (runtime.heartbeatTimer.unref) runtime.heartbeatTimer.unref();

  // Un envio temprano para que la instalacion aparezca en el panel enseguida.
  runtime.flushTimer = setTimeout(flush, 15000);
  if (runtime.flushTimer.unref) runtime.flushTimer.unref();

  return true;
}

async function shutdown({ timeoutMs = 1500 } = {}) {
  if (!runtime.enabled) return;

  clearInterval(runtime.heartbeatTimer);
  clearTimeout(runtime.flushTimer);

  runtime.bus.emit('telemetry:heartbeat');
  track('app', 'shutdown', { duration_minutes: sessionMinutes(), platforms_used: platformsUsed() });

  await flush({ timeoutMs, retries: 0 });
  runtime.buffer.persist();
}

module.exports = {
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
