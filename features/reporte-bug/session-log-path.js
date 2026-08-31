'use strict';

/**
 * Migracion de getCurrentSessionLogPath (backend-viejo/server.js:165).
 * core/logger.js (Fase 1) gestiona el archivo de sesion; este modulo solo
 * expone su path.
 */
function getCurrentSessionLogPath(logger) {
  return logger.getSessionLogPath();
}

module.exports = { getCurrentSessionLogPath };
