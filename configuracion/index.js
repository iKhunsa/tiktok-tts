'use strict';

const { createConfigStore } = require('./store');
const { createPlatformConfigStore } = require('./platform-config-store');
const { getConfig } = require('./routes/get-config');
const { patchConfig } = require('./routes/patch-config');
const { getPlatformConfig } = require('./routes/get-platform-config');
const { patchPlatformConfig } = require('./routes/patch-platform-config');
const { getStatus } = require('./routes/get-status');
const { getLogs } = require('./routes/get-logs');
const { postClientLog } = require('./routes/post-client-log');
const { getSessionLogFile } = require('./routes/get-session-log-file');
const { getLogsDownloadAll } = require('./routes/get-logs-download-all');

module.exports = {
  name: 'configuracion',

  register({ app, wss, bus, logger }) {
    const configStore = createConfigStore(logger);
    const platformConfigStore = createPlatformConfigStore(logger);
    configStore.load();
    platformConfigStore.load();

    // Contrato de lectura sincrona (documentado en fase-02-configuracion.md,
    // seccion Riesgos): otros dominios piden 'config:get' via bus y reciben
    // el snapshot actual por callback — nunca importan store.js directo.
    // Se eligio esta forma sobre bus.emit('config:get') puramente async
    // porque /chat (Fase 7) necesita leer config en el hot path de cada
    // mensaje sin esperar un ciclo de eventos.
    bus.on('config:get', (respond) => {
      if (typeof respond === 'function') respond(configStore.config);
    }, 'configuracion');

    // Mismo patron para platform-config.json (clientId de Twitch) —
    // /canales (Fase 6) lo necesita para el flujo OAuth device-code.
    bus.on('platform-config:get', (respond) => {
      if (typeof respond === 'function') respond(platformConfigStore.platformConfig);
    }, 'configuracion');

    app.get('/api/config', getConfig(configStore));
    app.patch('/api/config', patchConfig(configStore, bus, logger));
    app.get('/api/platform-config', getPlatformConfig(platformConfigStore));
    app.patch('/api/platform-config', patchPlatformConfig(platformConfigStore));
    app.get('/api/status', getStatus(configStore, { wss }));
    app.get('/api/logs', getLogs(logger));
    app.post('/api/logs/client', postClientLog(logger));
    app.get('/api/logs/session-file', getSessionLogFile(logger));
    app.get('/api/logs/download-all', getLogsDownloadAll());

    return { rutas: 9, listeners: 1 };
  },
};
