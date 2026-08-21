'use strict';

const path = require('path');
const express = require('express');

/**
 * Crea la instancia Express base con los middlewares globales del kernel.
 * GET /api/status es la ruta de salud del propio kernel — no depende de
 * ningun dominio estar montado.
 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/status', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

module.exports = { createApp };
