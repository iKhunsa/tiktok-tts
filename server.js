'use strict';

const path = require('path');
const { createApp } = require('./core/app');
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

const app = createApp();
const server = startHttpServer(app, PORT, logger);
const { wss } = createWsServer(server, bus, logger);
attachBroadcast(bus, wss, logger);

// Dominios se agregan aca a partir de la Fase 2 en adelante:
// registerDomain({ app, wss, bus, logger, config }, require('./configuracion'));

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
