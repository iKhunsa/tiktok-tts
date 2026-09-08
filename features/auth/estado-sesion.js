'use strict';

// Estado de sesion en memoria. Fuente de verdad en runtime para
// bus.on('auth:get') y el contrato entitlements. Se hidrata del disco al
// arrancar y del servicio-cuentas en cada refresh/login.

const store = require('./session-store');

const VACIA = Object.freeze({
  signedIn: false,
  user: null,
  plan: 'free',
  entitlements: [],
  expiresAt: null,
  subscription: null,
  degraded: false,
});

// TTL de gracia: si el servicio no responde, se mantiene el cache hasta
// cachedAt + TTL. Pasado eso -> degrada a free (fail-safe: nunca Pro sin
// confirmacion del servidor).
const GRACIA_MS = 30 * 60 * 1000;

let _token = null;
let _sesion = { ...VACIA };
let _cachedAt = 0;

function normalizar(s) {
  if (!s || !s.user) return { ...VACIA };
  return {
    signedIn: true,
    user: { id: s.user.id, email: s.user.email, nombre: s.user.nombre || '' },
    plan: s.plan === 'pro' ? 'pro' : 'free',
    entitlements: Array.isArray(s.entitlements) ? s.entitlements.slice() : [],
    expiresAt: s.expiresAt || null,
    subscription: s.subscription || null,
    degraded: false,
  };
}

function hidratarDesdeDisco() {
  const p = store.cargar();
  if (!p) return;
  _token = p.token;
  _sesion = normalizar(p.session);
  _cachedAt = p.cachedAt || Date.now();
}

// Aplica un objeto de sesion fresco del servicio (con token opcional nuevo).
function aplicar({ token, session }, logger) {
  if (token) _token = token;
  _sesion = normalizar(session);
  _cachedAt = Date.now();
  store.guardar({ token: _token, session: _sesion, cachedAt: _cachedAt }, logger);
}

function cerrar(logger) {
  _token = null;
  _sesion = { ...VACIA };
  _cachedAt = 0;
  store.limpiar(logger);
}

// Marca que el servicio no respondio. Dentro de la gracia mantiene el cache;
// fuera de gracia degrada a free.
function marcarDegradado() {
  if (!_sesion.signedIn) return;
  if (Date.now() - _cachedAt <= GRACIA_MS) {
    _sesion = { ..._sesion, degraded: true };
  } else {
    _sesion = { ...VACIA, user: _sesion.user, signedIn: true, degraded: true, expiresAt: _sesion.expiresAt };
  }
}

const getToken = () => _token;
const getSesion = () => ({ ..._sesion, entitlements: _sesion.entitlements.slice() });

module.exports = {
  VACIA, hidratarDesdeDisco, aplicar, cerrar, marcarDegradado, getToken, getSesion,
};
