'use strict';

const { isLocalHostname } = require('../../core/security/is-local-request');
const { isPrivateIP } = require('../../core/security/is-private-ip');

let pairedReported = false;

/** Middleware de IP privada para /mobile y /api/mobile/*. */
function validateMobileRequest(deps) {
  const { bus, logger } = deps;
  return (req, res, next) => {
    const clientIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress.replace(/^::ffff:/, '') : '';
    if (!isPrivateIP(clientIp) && !isLocalHostname(clientIp)) {
      logger.log(
        'warn', 'movil', 'movil/validate-request.js#validateMobileRequest', 'movil.acceso.rechazado',
        `Acceso a ${req.path} rechazado: IP no privada`, { ip: clientIp, motivo: 'ip-no-privada' }
      );
      return res.status(403).json({ error: 'Solo acceso desde red local' });
    }
    // Se registra una sola vez por sesion: interesa "usa el panel movil", no
    // cuantas peticiones hace (son muchas, es una UI que refresca).
    if (!pairedReported) {
      pairedReported = true;
      logger.log(
        'info', 'movil', 'movil/validate-request.js#validateMobileRequest', 'movil.emparejado',
        `Panel movil emparejado desde ${clientIp}`, { ip: clientIp }
      );
      bus.emit('movil:emparejado', { ip: clientIp });
    }
    return next();
  };
}

module.exports = { validateMobileRequest };
