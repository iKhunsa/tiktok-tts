'use strict';

function getRequestHostname(hostHeader = '') {
  const raw = String(hostHeader || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) return raw.slice(1, raw.indexOf(']'));
  return raw.split(':')[0];
}

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

// La cabecera Host identifica el destino solicitado, no al cliente. Nunca se
// debe usar para autorizar una request: cualquiera que alcance el puerto puede
// enviar `Host: localhost`. La IP del socket si viene del transporte HTTP y no
// puede falsificarse con headers (la app no corre detras de un proxy inverso).
function getRequestClientIp(req) {
  const address = req && req.socket && req.socket.remoteAddress;
  return String(address || '').trim().toLowerCase().replace(/^::ffff:/, '');
}

function isLoopbackIp(ip) {
  return ['127.0.0.1', '::1'].includes(String(ip || '').trim().toLowerCase().replace(/^::ffff:/, ''));
}

function isLoopbackRequest(req) {
  return isLoopbackIp(getRequestClientIp(req));
}

module.exports = { getRequestHostname, isLocalHostname, getRequestClientIp, isLoopbackIp, isLoopbackRequest };
