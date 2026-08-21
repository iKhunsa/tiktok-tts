'use strict';

const path = require('path');
const express = require('express');

/**
 * Crea la instancia Express base con los middlewares globales del kernel.
 * `bus` es opcional (Fase 1 la crea sin bus; server.js la pasa desde la
 * Fase 12 para instrumentar que overlays de OBS se abren).
 */
function createApp(bus) {
  const app = express();
  app.use(express.json());

  if (bus) {
    // Overlays cargados en OBS. Se registra cual se abre, no cuantas veces:
    // OBS recarga la fuente en cada cambio de escena.
    app.use((req, _res, next) => {
      const m = /^\/overlay-([a-z-]+)\.html$/.exec(req.path);
      if (m) bus.emit('overlay:opened', { overlay: m[1] });
      next();
    });
  }

  app.use(express.static(path.join(__dirname, '..', 'public')));

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

module.exports = { createApp, attachFallbackStatus };
