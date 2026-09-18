'use strict';

const path = require('path');
const { createApp, attachFallbackStatus, attachErrorHandler } = require('./core/app');
const { startHttpServer } = require('./core/http-server');
const { createWsServer } = require('./core/ws-server');
const { createEventBus } = require('./core/event-bus');
const { createLogger } = require('./core/logger');
const { registerDomain } = require('./core/register-domain');
const { attachBroadcast } = require('./core/broadcast');
const { DATA_BASE } = require('./core/paths');
const { attachAccountDataPath } = require('./core/account-data-path');

const PORT = process.env.PORT || 3000;

const logger = createLogger({ logsDir: path.join(DATA_BASE, 'logs') });
const bus = createEventBus(logger);
attachAccountDataPath(bus);
logger.attachBus(bus);

const app = createApp(bus);
const server = startHttpServer(app, PORT, logger);
const { wss } = createWsServer(server, bus, logger);
attachBroadcast(bus, wss, logger);

const deps = { app, wss, bus, logger };

function mount(domain, modulePath) {
  try {
    return registerDomain(deps, require(modulePath));
  } catch (error) {
    logger.log(
      'fatal', domain, 'server.js#mount', 'core.dominio.fallo_carga',
      `Dominio ${domain} fallo al cargar: ${error.message}`,
      { domain, modulePath, error: error.message, stack: error.stack }
    );
    return false;
  }
}

mount('configuracion', './features/configuracion');
mount('auth', './features/auth');
mount('idioma', './features/idioma');
mount('reporte-bug', './features/reporte-bug');
mount('moderacion', './features/moderacion');
mount('canales', './features/canales');
mount('chat', './features/chat');
mount('promo', './features/promo');
mount('overlay', './features/overlay');
mount('movil', './features/movil');
mount('sonido', './features/sonido');
mount('bot', './features/bot');
mount('clips', './features/clips');
mount('avanzado', './features/avanzado');
mount('donar', './features/donar');
mount('portal-view', './features/portal-view');
mount('telemetria', './features/telemetria');
// mcp va ULTIMO: para cuando corre su register(), cada dominio ya llamo
// mcpRegistry.registerTool() desde el suyo, asi que el set de tools esta completo.
mount('mcp', './features/mcp');
// Los 16 dominios de negocio (features/) ya estan registrados. /electron-shell
// y /telemetria/runtime.js se conectan desde main.js (no son rutas Express).

// Va al final: si algun dominio ya registro GET /api/status, ese gana
// (Express usa el primer handler que responde en la misma ruta).
attachFallbackStatus(app);

// Ultimo de todo: middleware de error global. Cualquier throw de un handler de
// ruta que no se haya manejado localmente cae aca (se loguea + 500 generico).
attachErrorHandler(app, logger);

process.on('uncaughtException', (error) => {
  logger.log(
    'fatal',
    'core',
    'server.js#uncaughtException',
    'core.boundary.excepcion_capturada',
    `Excepcion no capturada en el proceso: ${error.message}`,
    { error: error.message, stack: error.stack }
  );
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.log(
    'fatal',
    'core',
    'server.js#unhandledRejection',
    'core.boundary.excepcion_capturada',
    `Promesa rechazada sin manejar: ${error.message}`,
    { error: error.message, stack: error.stack }
  );
});

// El shutdown ordenado de los dominios (core/shutdown.js#shutdownAll) es async y
// lo dispara main.js en 'before-quit'. No se engancha a process.on('exit') aca:
// ese handler tiene que ser sincrono y abandonaria toda microtask pendiente, o
// sea que ningun domain.shutdown() llegaria a correr. En `node server.js` suelto
// (sin Electron) no hay teardown ordenado — es dev-only, aceptado.

module.exports = { app, server, bus, logger };
