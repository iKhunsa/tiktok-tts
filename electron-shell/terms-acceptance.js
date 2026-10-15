'use strict';

// Decide si ya hay una aceptación de Términos y Privacidad guardada. Sin ella
// no se inicializa ninguna analítica, error tracking ni telemetría.
//
// El instalador NSIS escribe terminos-aceptados.json en userData solo cuando
// el usuario pulsa "Acepto" (no en modo silencioso /S). No se compara la
// versión: el instalador ya re-pide aceptar en cada instalación/actualización.
// Nunca lanza: se llama en el arranque de la app.

const nodeFs = require('fs');
const path = require('path');

const ACCEPTANCE_FILE = 'terminos-aceptados.json';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasAcceptedTerms({ isPackaged, userDataDir, fs = nodeFs }) {
  if (!isPackaged) return true;
  try {
    const record = JSON.parse(fs.readFileSync(path.join(userDataDir, ACCEPTANCE_FILE), 'utf8'));
    return Boolean(record) && isNonEmptyString(record.version) && isNonEmptyString(record.fecha);
  } catch (_) {
    return false;
  }
}

module.exports = { hasAcceptedTerms, ACCEPTANCE_FILE };
