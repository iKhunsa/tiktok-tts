'use strict';

const path = require('path');
const { createApp, attachFallbackStatus, attachErrorHandler } = require('./core/app');
const { startHttpServer } = require('./core/http-server');
const { createWsServer } = require('./core/ws-server');
const { createEventBus } = require('./core/event-bus');
const { createLogger } = require('./core/logger');
const { registerDomain } = require('./core/register-domain');
const { attachBroadcast } = require('./core/broadcast');
const { shutdownAll } = require('./core/shutdown');
const { DATA_BASE } = require('./core/paths');

const PORT = process.env.PORT || 3000;

const logger = createLogger({ logsDir: path.join(DATA_BASE, 'logs') });
const bus = createEventBus(logger);
logger.attachBus(bus);

const app = createApp(bus);
const server = startHttpServer(app, PORT, logger);
const { wss } = createWsServer(server, bus, logger);
attachBroadcast(bus, wss, logger);

const deps = { app, wss, bus, logger };

registerDomain(deps, require('./features/configuracion'));
registerDomain(deps, require('./features/idioma'));
registerDomain(deps, require('./features/reporte-bug'));
registerDomain(deps, require('./features/moderacion'));
registerDomain(deps, require('./features/canales'));
registerDomain(deps, require('./features/chat'));
registerDomain(deps, require('./features/promo'));
registerDomain(deps, require('./features/overlay'));
registerDomain(deps, require('./features/movil'));
registerDomain(deps, require('./features/sonido'));
registerDomain(deps, require('./features/bot'));
registerDomain(deps, require('./features/clips'));
registerDomain(deps, require('./features/avanzado'));
registerDomain(deps, require('./features/donar'));
registerDomain(deps, require('./features/telemetria'));
// mcp va ULTIMO: para cuando corre su register(), cada dominio ya llamo
// mcpRegistry.registerTool() desde el suyo, asi que el set de tools esta completo.
registerDomain(deps, require('./features/mcp'));
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

process.on('exit', () => {
  shutdownAll(logger);
});

module.exports = { app, server, bus, logger };
