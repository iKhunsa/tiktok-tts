'use strict';

const MAX_ERRORS_PER_SESSION = 50;

/**
 * Se suscribe a error:handled/error:uncaught (emitidos por core/logger.js y
 * core/error-boundary.js desde la Fase 1). Desde este punto en adelante,
 * cualquier fallo de las fases siguientes queda capturado y trazado hasta
 * aca. Reenvio a Discord/telemetria de errores individuales queda fuera de
 * alcance: no existe hoy config de severidad ni integracion de telemetria
 * (Fase 12) — solo el reporte de bug explicito (POST /api/report-bug) manda
 * a Discord.
 */
function attachErrorListeners(bus, logger) {
  let errorCount = 0;
  let capWarned = false;

  function handle(kind) {
    return (payload) => {
      errorCount++;
      if (errorCount > MAX_ERRORS_PER_SESSION) {
        if (!capWarned) {
          capWarned = true;
          logger.log(
            'warn', 'reporte-bug', 'reporte-bug/error-listeners.js#attachErrorListeners', 'reporte_bug.limite_sesion_alcanzado',
            `Se alcanzo el limite de ${MAX_ERRORS_PER_SESSION} errores contados en esta sesion`, { max: MAX_ERRORS_PER_SESSION }
          );
        }
        return;
      }

      if (kind === 'uncaught') {
        logger.log(
          'fatal', 'reporte-bug', 'reporte-bug/error-listeners.js#attachErrorListeners', 'reporte_bug.error_uncaught.capturado',
          `Error no capturado propagado desde ${payload.domain || payload.where || 'desconocido'} — el proceso sigue vivo`,
          { where: payload.domain || payload.where, message: payload.message, stack: payload.stack }
        );
      } else {
        logger.log(
          'debug', 'reporte-bug', 'reporte-bug/error-listeners.js#attachErrorListeners', 'reporte_bug.error_handled.recibido',
          `Error manejado recibido desde ${payload.domain || 'desconocido'}`,
          { domain: payload.domain, function: payload.function, event: payload.event }
        );
      }
    };
  }

  bus.on('error:uncaught', handle('uncaught'), 'reporte-bug');
  bus.on('error:handled', handle('handled'), 'reporte-bug');
}

module.exports = { attachErrorListeners };
