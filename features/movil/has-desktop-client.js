'use strict';

const WebSocket = require('ws');

function hasDesktopClient(wss) {
  for (const client of wss.clients) {
    if (client.isDesktop && client.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

module.exports = { hasDesktopClient };
