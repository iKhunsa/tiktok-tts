'use strict';

// Arranca el server real en un puerto efímero para tests de integración.
// Ningún otro test bootea el server; este helper lo aísla.
//
//   const { bootServer } = require('./helpers/boot-server');
//   const srv = bootServer();            // { app, server, bus, logger, port, close }
//   test.after(() => srv.close());

process.env.PORT = process.env.PORT || '0';

function bootServer() {
  const mod = require('../../server');
  const addr = mod.server.address();
  return {
    ...mod,
    port: addr && typeof addr === 'object' ? addr.port : addr,
    close() {
      try { mod.server.close(); } catch (_) { /* noop */ }
      try { mod.wss && mod.wss.close && mod.wss.close(); } catch (_) { /* noop */ }
    },
  };
}

module.exports = { bootServer };
