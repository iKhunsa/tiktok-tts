'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE, DATA_BASE } = require('../../core/paths');

// URL del servicio-cuentas (auth + suscripciones, self-hosted en el VPS).
// Precedencia: env CUENTAS_URL -> <userData>/cuentas.json campo "url" ->
// <resources>/cuentas-config.json campo "url" -> null (dominio en no-op).
// Mismo patron que main.js#resolveTelemetryUrl / glitchtip#resolverDsn.

const USER_FILE = path.join(DATA_BASE, 'cuentas.json');
const BUNDLED_FILE = path.join(RESOURCE_BASE, 'cuentas-config.json');

function leerCampo(file, campo) {
  try {
    if (!fs.existsSync(file)) return null;
    const v = JSON.parse(fs.readFileSync(file, 'utf8'))[campo];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  } catch (_) {
    return null;
  }
}

function esHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\//.test(u.trim());
}

function resolverUrl() {
  if (process.env.CUENTAS_URL === '') return null; // opt-out explicito (tests, build sin cuentas)
  const env = (process.env.CUENTAS_URL || '').trim();
  if (esHttpUrl(env)) return env.replace(/\/+$/, '');
  const user = leerCampo(USER_FILE, 'url');
  if (esHttpUrl(user)) return user.replace(/\/+$/, '');
  const bundled = leerCampo(BUNDLED_FILE, 'url');
  if (esHttpUrl(bundled)) return bundled.replace(/\/+$/, '');
  return null;
}

module.exports = { resolverUrl, USER_FILE, BUNDLED_FILE };
