'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const { getRequestHostname, isLocalHostname } = require('./security/is-local-request');
const { isPrivateIP } = require('./security/is-private-ip');

function isAllowedWsClient(info) {
  const host = getRequestHostname(info.req.headers.host);
  const clientIp = info.req.socket && info.req.socket.remoteAddress
    ? info.req.socket.remoteAddress.replace(/^::ffff:/, '')
    : '';
  if (!isLocalHostname(host) && !isPrivateIP(clientIp)) return false;

  const origin = info.origin || info.req.headers.origin;
  if (!origin) return true;
  try {
    const oh = new URL(origin).hostname;
    return isLocalHostname(oh) || isPrivateIP(oh);
  } catch (_) {
    return false;
  }
}

/**
 * WebSocketServer generico. Publica conexiones/mensajes al bus — ningun
 * dominio toca wss.clients directo (core/broadcast.js es el unico traductor
 * bus → WS de salida).
 */
function createWsServer(server, bus, logger) {
  const wss = new WebSocket.Server({
    server,
    verifyClient: (info, cb) => {
      const allowed = isAllowedWsClient(info);
      if (!allowed) {
        const clientIp = info.req.socket && info.req.socket.remoteAddress
          ? info.req.socket.remoteAddress.replace(/^::ffff:/, '')
          : '';
        logger.log(
          'warn',
          'core',
          'core/ws-server.js#verifyClient',
          'core.ws.origen_rechazado',
          `Conexion WS rechazada por origen/host no local (host=${info.req.headers.host})`,
          { ip: clientIp, hostHeader: info.req.headers.host, origin: info.origin || info.req.headers.origin || '' }
        );
      }
      cb(allowed);
    },
  });

  wss.on('connection', (ws, req) => {
    const clientId = crypto.randomUUID();
    const ip = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress.replace(/^::ffff:/, '') : '';
    const esDesktop = isLocalHostname(getRequestHostname(req.headers.host));
    ws.clientId = clientId;

    logger.log(
      'info',
      'core',
      'core/ws-server.js#onConnection',
      'core.ws.cliente_conectado',
      `Cliente WS conectado: ${clientId}`,
      { clientId, ip, esDesktop, totalClientes: wss.clients.size }
    );

    ws.on('message', (raw) => {
      const rawStr = raw.toString();
      let parsed;
      try {
        parsed = JSON.parse(rawStr);
      } catch (error) {
        logger.log(
          'debug',
          'core',
          'core/ws-server.js#onMessage',
          'core.ws.mensaje_invalido',
          `Mensaje WS entrante de ${clientId} no es JSON valido`,
          { clientId, rawPreview: rawStr.slice(0, 200) }
        );
        return;
      }
      bus.emit('ws:mensaje-entrante', { clientId, ws, data: parsed });
    });

    ws.on('close', () => {
      logger.log(
        'info',
        'core',
        'core/ws-server.js#onClose',
        'core.ws.cliente_desconectado',
        `Cliente WS desconectado: ${clientId}`,
        { clientId, totalClientes: wss.clients.size - 1 }
      );
    });
  });

  return { wss };
}

module.exports = { createWsServer, isAllowedWsClient };
