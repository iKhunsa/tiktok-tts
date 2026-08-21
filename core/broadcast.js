'use strict';

const WebSocket = require('ws');

/**
 * Unico punto que traduce eventos del bus a wss.clients.forEach(...). Ningun
 * dominio importa ws-server.js directo ni llama .send() — todos pasan por
 * bus.emit('ws:broadcast', data) y este archivo hace la traduccion.
 */
function attachBroadcast(bus, wss, logger) {
  bus.on(
    'ws:broadcast',
    (data) => {
      const msg = JSON.stringify(data);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    },
    'core'
  );
}

module.exports = { attachBroadcast };
