'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { getRequestHostname, isLocalHostname, isLoopbackRequest } = require('./security/is-local-request');
const { staticRoot } = require('./static-root');
const { crearGuardSuscripcion } = require('./guard-suscripcion');
const { DATA_BASE } = require('./paths');

/**
 * Resuelve el token MCP desde el entorno o el archivo de usuario documentado.
 * El archivo no se mezcla con config.json porque ese store elimina claves que
 * no conoce. Se lee solo al atender /mcp, por lo que cambiarlo requiere cero
 * reinicios y no afecta el hot path normal de la aplicacion.
 */
function getMcpToken({ env = process.env, file = path.join(DATA_BASE, 'mcp.json') } = {}) {
  const envToken = String(env.MCP_TOKEN || '').trim();
  if (envToken) return envToken;
  try {
    const token = JSON.parse(fs.readFileSync(file, 'utf8')).token;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch (_) {
    return null;
  }
}

function hasValidBearerToken(header, token) {
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(String(header || ''));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/**
 * Todas las APIs no móviles son locales. El servidor escucha en la LAN para
 * servir el panel móvil, por lo que Host/Origin por sí solos no son una
 * frontera de seguridad: un cliente remoto puede falsificarlos. Se exige la
 * IP real loopback del socket tanto para lecturas sensibles como mutaciones.
 * /api/mobile/* y /mobile conservan su guard de IP privada propio. /mcp es la
 * excepción explícita: con un bearer configurado se puede usar remotamente.
 */
function validateLocalApiRequest(req, res, next) {
  const requestPath = String(req.path || '').toLowerCase();
  if (requestPath.startsWith('/api/mobile') || requestPath === '/mobile') return next();

  const isMcp = requestPath === '/mcp' || requestPath.startsWith('/mcp/');
  if (isMcp) {
    const token = getMcpToken();
    if (token) {
      if (hasValidBearerToken(req.headers.authorization, token)) return next();
      return res.status(401).json({ error: 'MCP token invalido o ausente' });
    }
  }

  // Archivos estáticos públicos (incluido mobile.html) quedan fuera: el panel
  // móvil necesita descargar sus assets desde la LAN. Sus APIs sí están
  // cubiertas por el guard móvil, y el resto de /api queda solo-loopback.
  if (!isMcp && !requestPath.startsWith('/api/')) return next();

  if (!isLoopbackRequest(req)) {
    return res.status(403).json({ error: 'Acceso local requerido' });
  }

  const host = getRequestHostname(req.headers.host);
  if (!isLocalHostname(host)) {
    return res.status(403).json({ error: 'Host no permitido' });
  }

  const source = req.headers.origin || req.headers.referer;
  if (source) {
    try {
      if (!isLocalHostname(new URL(source).hostname)) {
        return res.status(403).json({ error: 'Origen no permitido' });
      }
    } catch (_) {
      return res.status(403).json({ error: 'Origen no permitido' });
    }
  }

  return next();
}

/**
 * Crea la instancia Express base con los middlewares globales del kernel.
 * `bus` es opcional (Fase 1 la crea sin bus; server.js la pasa desde la
 * Fase 12 para instrumentar que overlays de OBS se abren).
 */
function createApp(bus) {
  const app = express();
  app.set('case sensitive routing', true);
  app.use(express.json());
  app.use(validateLocalApiRequest);
  // Con subscriptionsEnabled activo, /api/* exige sesion (salvo whitelist).
  app.use(crearGuardSuscripcion(bus));

  if (bus) {
    // Overlays cargados en OBS. Se registra cual se abre, no cuantas veces:
    // OBS recarga la fuente en cada cambio de escena.
    app.use((req, _res, next) => {
      const m = /^\/overlay-([a-z-]+)\.html$/.exec(req.path);
      if (m) bus.emit('overlay:opened', { overlay: m[1] });
      next();
    });
  }

  // Raiz estatica: interfaz/dist en dev, <resources>/public en empaquetado.
  // Se resuelve contra RESOURCE_BASE — ver core/static-root.js. NUNCA armar
  // esto con un path relativo a __dirname: en el paquete NSIS __dirname cae
  // dentro del asar, donde interfaz/ no viaja, y GET / devuelve "Cannot GET /".
  app.use(express.static(staticRoot()));

  return app;
}

/**
 * Ruta de salud minima del kernel. Se registra DESPUES de montar los
 * dominios (ver server.js) para que si /configuracion ya monto su propio
 * GET /api/status mas completo, ese gana (Express usa el primer handler
 * registrado en la misma ruta). Si /configuracion todavia no existe (Fase 1),
 * esta es la unica respuesta disponible.
 */
function attachFallbackStatus(app) {
  app.get('/api/status', (_req, res) => {
    res.json({ ok: true });
  });
}

/**
 * Middleware de error global. Se registra al FINAL (despues de todas las rutas
 * y del fallback status, ver server.js). Cualquier throw sincrono de un handler
 * de ruta cae aca automaticamente; los handlers async que rechazan tienen que
 * pasar el error a next() (los pocos que hay lo hacen con try/catch propio).
 * Se loguea con la ruta y se responde 500 generico (nunca el stack crudo al cliente).
 *
 * Errores de clase 4xx (statusCode < 500): NO son bugs de la app. express.static
 * reenvia aca un ENOENT con statusCode 404 cuando un asset existio para fs.stat
 * pero fallo al abrir (TOCTOU con el antivirus, o un index.html cacheado de una
 * version vieja pidiendo un PNG que ya no existe — GlitchTip #61); body-parser
 * reenvia "request aborted" con status 400. Se responde con ese codigo y no se
 * loguea como core.ruta.excepcion (si no, cada asset faltante = un issue).
 */
function attachErrorHandler(app, logger) {
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const error = err instanceof Error ? err : new Error(String(err));
    const status = error.statusCode || error.status || 500;

    if (status < 500) {
      if (!res.headersSent) res.status(status).end();
      return;
    }

    logger.log(
      'error', 'core', 'core/app.js#errorHandler', 'core.ruta.excepcion',
      `Excepcion no manejada en ${req.method} ${req.originalUrl}: ${error.message}`,
      { route: req.originalUrl, method: req.method, error: error.message, stack: error.stack }
    );
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
}

module.exports = {
  createApp,
  attachFallbackStatus,
  attachErrorHandler,
  validateLocalApiRequest,
  getMcpToken,
  hasValidBearerToken,
};
