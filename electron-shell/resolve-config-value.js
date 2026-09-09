'use strict';

const fs = require('fs');

// Lee un valor de config con el mismo orden de prioridad que usan telemetria
// (main.js), Aptabase y GlitchTip para su URL/token/appKey/DSN: 1) env vars
// (primera no vacia gana, sin validar — es un override de dev, se asume
// correcto), 2) un JSON de usuario en userData (override manual), 3) un JSON
// bakeado en el build (default de fabrica). Antes vivia repetido en los 3.
function leerCampoJson(file, campo) {
  try {
    if (!file || !fs.existsSync(file)) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))[campo];
    return (typeof value === 'string' && value.trim()) ? value.trim() : null;
  } catch (_) {
    return null;
  }
}

function resolveConfigValue({ envVars = [], userFile, bundledFile, field, validate, fallback = null }) {
  for (const envVar of envVars) {
    const v = process.env[envVar];
    if (v && v.trim()) return v.trim();
  }
  const fromUser = leerCampoJson(userFile, field);
  if (fromUser && (!validate || validate(fromUser))) return fromUser;
  const fromBundled = leerCampoJson(bundledFile, field);
  if (fromBundled && (!validate || validate(fromBundled))) return fromBundled;
  return fallback;
}

module.exports = { resolveConfigValue };
