'use strict';

const path = require('path');
const express = require('express');

/**
 * Crea la instancia Express base con los middlewares globales del kernel.
 */
function createApp() {
  const app = express();
  app.use(express.json());
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
