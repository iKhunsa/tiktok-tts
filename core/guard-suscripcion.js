'use strict';

// subscriptionsEnabled ON -> toda ruta /api/* que sirve funcionalidad exige
// sesion iniciada (cualquier plan). Whitelist chica: bootstrap del cliente,
// login, y lo que consumen los overlays de OBS (que nunca estan logueados).
// Flag OFF -> passthrough total (rollback del proyecto). El gating Pro por
// feature (core/contracts/entitlements#guard) sigue por encima, sin cambios.

const ABIERTAS = new Set([
  'GET /api/config', // bootstrap del cliente + overlays
  'GET /api/status', // health
  'POST /api/logs/client', // sink de errores (app + overlays)
  'GET /api/overlay-stats', // overlays de OBS
  'GET /api/gifts-list', // overlay de alertas
  'GET /api/mcp/info', // panel MCP (auth propia via MCP_TOKEN)
  'POST /api/report-bug', // escape hatch: reportar que el login falla
]);

function crearGuardSuscripcion(bus) {
  if (!bus) return (_req, _res, next) => next(); // createApp() sin bus (tests)

  // Cacheado, no releido en cada request (mismo patron que features/auth/index.js).
  let subsOn = false;
  const leerConfig = () => {
    bus.emit('config:get', (c) => { subsOn = !!(c && c.subscriptionsEnabled); });
  };
  leerConfig();
  bus.on('config:actualizado', ({ keysChanged } = {}) => {
    if (!keysChanged || keysChanged.includes('subscriptionsEnabled')) leerConfig();
  }, 'core');

  return function guardSuscripcion(req, res, next) {
    const p = (req.path || '/').toLowerCase().replace(/\/+$/, '') || '/';
    if (!p.startsWith('/api/')) return next();
    // /api/auth/* son las rutas del dominio de cuentas (login, session, etc.),
    // pero /api/auth/twitch/* son el OAuth de Twitch (features/canales) —
    // comparten prefijo por accidente y no deben eximirse del muro.
    if (p.startsWith('/api/auth/') && !p.startsWith('/api/auth/twitch/')) return next();
    if (ABIERTAS.has(`${req.method} ${p}`)) return next();
    if (!subsOn) return next();

    let sesion;
    bus.emit('auth:get', (s) => { sesion = s; });
    if (sesion === undefined) return next(); // sin dominio auth: no hay como loguearse
    if (sesion.signedIn) return next();

    return res.status(401).json({
      error: 'Iniciá sesión para usar la app',
      errorKey: 'errors.unauthorized',
    });
  };
}

module.exports = { crearGuardSuscripcion };
