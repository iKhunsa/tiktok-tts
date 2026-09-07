'use strict';

const CONNECT_WINDOW_MS = 10000;
const CONNECT_MAX = 10;

function createRateLimiterState() {
  return { connectRequestTimes: [] };
}

function isConnectRateLimited(state) {
  const now = Date.now();
  while (state.connectRequestTimes.length && state.connectRequestTimes[0] < now - CONNECT_WINDOW_MS) {
    state.connectRequestTimes.shift();
  }
  if (state.connectRequestTimes.length >= CONNECT_MAX) return true;
  state.connectRequestTimes.push(now);
  return false;
}

/** Compartido por los 3 endpoints de conexion — el limite es global entre los 3. */
function connectRateLimiter(state, logger) {
  return (req, res, next) => {
    if (isConnectRateLimited(state)) {
      logger.log(
        'warn', 'canales', 'canales/rate-limit.js#connectRateLimiter', 'canales.rate_limit.bloqueado',
        `Rate limit de conexion alcanzado en ${req.originalUrl}`, { ip: req.ip, endpoint: req.originalUrl }
      );
      return res.status(429).json({ error: 'Demasiados intentos de conexión. Espera unos segundos.' });
    }
    next();
  };
}

module.exports = { createRateLimiterState, isConnectRateLimited, connectRateLimiter };
