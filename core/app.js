'use strict';

const path = require('path');
const express = require('express');
const { getRequestHostname, isLocalHostname } = require('./security/is-local-request');

/**
 * Bloquea mutaciones (POST/PATCH/DELETE/PUT) que no vengan de localhost —
 * protege TODAS las rutas de escritura de todos los dominios contra CSRF/
 * acceso desde otra maquina de la red. /api/mobile/* y /mobile quedan
 * afuera a proposito: esas rutas ya validan IP privada por su cuenta
 * (movil/validate-request.js, Fase 8) porque el panel movil necesita
 * mutar desde otro dispositivo de la LAN.
 * Migracion de validateLocalMutation (backend-viejo/server.js:222).
 */
function validateLocalMutation(req, res, next) {
  if (req.path.startsWith('/api/mobile') || req.path === '/mobile') return next();
  // /mcp: si MCP_TOKEN esta seteado, se acepta desde cualquier host con el
  // bearer correcto (para agentes remotos); si no, cae al chequeo local de
  // abajo (comportamiento por defecto — solo-localhost). Espeja /api/mobile*.
  if (req.path === '/mcp' || req.path.startsWith('/mcp/')) {
    const token = (process.env.MCP_TOKEN || '').trim();
    if (token) {
      const auth = req.headers.authorization || '';
      if (auth === `Bearer ${token}`) return next();
      return res.status(401).json({ error: 'MCP token invalido o ausente' });
    }
    // sin token configurado → sigue el chequeo local normal
  }
  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return next();

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
  app.use(express.json());
  app.use(validateLocalMutation);

  if (bus) {
    // Overlays cargados en OBS. Se registra cual se abre, no cuantas veces:
    // OBS recarga la fuente en cada cambio de escena.
    app.use((req, _res, next) => {
      const m = /^\/overlay-([a-z-]+)\.html$/.exec(req.path);
      if (m) bus.emit('overlay:opened', { overlay: m[1] });
      next();
    });
  }

  // Fase-06: la migracion del frontend a interfaz/ (fases 01-05) termino
  // y public/ se borro del repo. interfaz/dist es el output de Vite
  // (HTML + JS/CSS de las 10 vistas + estaticos de interfaz/publico/) y
  // es ahora la UNICA raiz estatica — ya no hay legado detras para
  // sombrear.
  app.use(express.static(path.join(__dirname, '..', 'interfaz', 'dist')));

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
 */
function attachErrorHandler(app, logger) {
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const error = err instanceof Error ? err : new Error(String(err));
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

module.exports = { createApp, attachFallbackStatus, attachErrorHandler };
