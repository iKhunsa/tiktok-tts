'use strict';

const http = require('http');

function startHttpServer(app, port, logger) {
  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.log(
        'fatal',
        'core',
        'core/http-server.js#start',
        'core.http.puerto_en_uso',
        `El puerto ${port} ya esta en uso`,
        { port, error: error.message }
      );
    } else {
      logger.log(
        'fatal',
        'core',
        'core/http-server.js#start',
        'core.http.error_listen',
        `Error al escuchar en el puerto ${port}: ${error.message}`,
        { port, error: error.message, stack: error.stack }
      );
    }
  });

  server.listen(port, () => {
    logger.log(
      'info',
      'core',
      'core/http-server.js#start',
      'core.http.iniciado',
      `Servidor HTTP escuchando en el puerto ${port}`,
      { port, pid: process.pid }
    );
  });

  return server;
}

module.exports = { startHttpServer };
