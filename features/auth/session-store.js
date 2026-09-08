'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_BASE } = require('../../core/paths');

// Persistencia del token + ultimo estado de sesion conocido.
// DATA_BASE/auth-session.json. Patron auth-tokens-store.js: writeFileSync,
// nunca lanza (el require corre al arrancar la app). El token NUNCA se loguea.

const FILE = path.join(DATA_BASE, 'auth-session.json');

function cargar() {
  try {
    if (!fs.existsSync(FILE)) return null;
    const p = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return p && typeof p === 'object' && p.token ? p : null;
  } catch (_) {
    return null;
  }
}

// data: { token, session, cachedAt }  (session = objeto de sesion sin token)
function guardar(data, logger) {
  try {
    fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (error) {
    logger.log(
      'error', 'auth', 'auth/session-store.js#guardar', 'auth.store.guardado_fallido',
      `No se pudo guardar auth-session.json: ${error.message}`,
      { path: FILE, error: error.message, stack: error.stack }
    );
  }
}

function limpiar(logger) {
  try {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
  } catch (error) {
    logger.log(
      'warn', 'auth', 'auth/session-store.js#limpiar', 'auth.store.limpiado_fallido',
      `No se pudo borrar auth-session.json: ${error.message}`, { path: FILE }
    );
  }
}

module.exports = { cargar, guardar, limpiar, FILE };
