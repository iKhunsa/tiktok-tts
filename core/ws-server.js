'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const { getRequestHostname, isLocalHostname } = require('./security/is-local-request');
const { isPrivateIP } = require('./security/is-private-ip');

const MAX_MESSAGE_BYTES = 64 * 1024; // 64 KB — sobra para comandos moviles/state-sync
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 30; // por cliente por segundo
const RATE_LIMIT_MAX_VIOLATIONS = 5; // ventanas seguidas por encima del limite -> se cierra la conexion

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
// ponytail: el WS no autentica sesion, solo origin/IP privada. subscriptionsEnabled
// no lo toca: los overlays de OBS no pueden loguearse y lo REQUIEREN, y es
// solo-broadcast (sin las rutas HTTP /api/*, ya gateadas, no se acciona nada).
// Techo: exigir un token via subprotocol/query chequeado aca, con excepcion para
// overlays, si algun dia importa.
function createWsServer(server, bus, logger) {
  const wss = new WebSocket.Server({
    server,
    maxPayload: MAX_MESSAGE_BYTES,
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

    let windowStart = Date.now();
    let windowCount = 0;
    let violations = 0;

    logger.log(
      'info',
      'core',
      'core/ws-server.js#onConnection',
      'core.ws.cliente_conectado',
      `Cliente WS conectado: ${clientId}`,
      { clientId, ip, esDesktop, totalClientes: wss.clients.size }
    );

    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
        violations = windowCount > RATE_LIMIT_MAX_MESSAGES ? violations + 1 : 0;
        windowStart = now;
        windowCount = 0;
        if (violations >= RATE_LIMIT_MAX_VIOLATIONS) {
          logger.log(
            'warn',
            'core',
            'core/ws-server.js#onMessage',
            'core.ws.rate_limit_excedido',
            `Cliente WS ${clientId} excedio el limite de mensajes/seg (violacion ${violations})`,
            { clientId, violations }
          );
          ws.close(1008, 'rate limit excedido');
          return;
        }
      }
      windowCount++;
      if (windowCount > RATE_LIMIT_MAX_MESSAGES) return;

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
      bus.emit('ws:mensaje-entrante', {
        clientId,
        data: parsed,
        ip,
        markDesktop: () => { ws.isDesktop = true; },
      });
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

    // Sin este handler, un 'error' del socket (reset abrupto, protocolo roto)
    // se propaga como excepcion no capturada del proceso.
    ws.on('error', (error) => {
      logger.log(
        'warn', 'core', 'core/ws-server.js#onSocketError', 'core.ws.socket_error',
        `Error en el socket WS ${clientId}: ${error.message}`, { clientId, error: error.message }
      );
    });
  });

  wss.on('error', (error) => {
    // El WSServer comparte el http.Server, asi que un fallo de listen
    // (EADDRINUSE cuando ya hay otra instancia / otro proceso en el puerto)
    // se emite por ambos. core/http-server.js ya lo reporta como
    // core.http.puerto_en_uso — no duplicar el issue (GlitchTip #53 + #54).
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') return;
    logger.log(
      'error', 'core', 'core/ws-server.js#onServerError', 'core.ws.servidor_error',
      `Error del servidor WebSocket: ${error.message}`, { error: error.message, stack: error.stack }
    );
  });

  return { wss };
}

module.exports = { createWsServer, isAllowedWsClient };
