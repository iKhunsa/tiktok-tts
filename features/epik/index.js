'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const mcpRegistry = require('../../core/contracts/mcp-registry');
const store = require('./store');
const { politicaEpik } = require('./content-policy');

const MAX_SUBIDA = '30mb';

/**
 * Archivos .epik: overlays a medida que el streamer importa como skin (por cuenta).
 * El diseno se sirve en /epik/<id>/ con sandbox por CSP: sin red y sin la API de la app.
 * Solo recibe los datos de su overlay por postMessage (interfaz/compartido/epik/anfitrion.js).
 */
module.exports = {
  name: 'epik',

  register({ app, bus, logger }) {
    const avisarCambio = () => bus.emit('ws:broadcast', { type: 'epik-changed' });

    function responderError(res, error, donde) {
      if (!(error instanceof store.ErrorEpik)) throw error;
      logger.log('warn', 'epik', donde, 'epik.importacion.rechazada', error.message, { errorKey: error.errorKey, ...error.extra });
      res.status(error.status).json({ ok: false, error: error.message, errorKey: error.errorKey, ...error.extra });
    }

    function importarBuffer(buffer, overlay) {
      const resultado = store.importar(buffer, overlay);
      const { id, overlay: tipo, version } = resultado.epik;
      logger.log('info', 'epik', 'importar', 'epik.importado', `.epik ${resultado.actualizado ? 'actualizado' : 'importado'}`, { id, overlay: tipo, version, actualizado: resultado.actualizado });
      avisarCambio();
      return resultado;
    }

    app.get('/api/epik', (req, res) => {
      res.json({ ok: true, soportados: store.OVERLAYS_SOPORTADOS, familias: store.FAMILIAS, epiks: store.listar(req.query.overlay, logger) });
    });

    app.post('/api/epik/importar', express.raw({ type: () => true, limit: MAX_SUBIDA }), (req, res) => {
      try {
        res.json({ ok: true, ...importarBuffer(req.body, req.query.overlay) });
      } catch (error) {
        responderError(res, error, 'routes/importar');
      }
    });

    // Las plantillas de la app no se eliminan: se descargan a la carpeta Descargas para partir de ellas.
    app.post('/api/epik/:id/descargar', (req, res) => {
      try {
        const ruta = store.descargarIntegrado(req.params.id);
        logger.log('info', 'epik', 'routes/descargar', 'epik.plantilla.descargada', 'Plantilla .epik descargada', { id: req.params.id });
        res.json({ ok: true, archivo: path.basename(ruta), ruta });
      } catch (error) {
        responderError(res, error, 'routes/descargar');
      }
    });

    app.delete('/api/epik/:id', (req, res) => {
      try {
        store.eliminar(req.params.id);
        logger.log('info', 'epik', 'routes/eliminar', 'epik.eliminado', '.epik eliminado', { id: req.params.id });
        avisarCambio();
        res.json({ ok: true });
      } catch (error) {
        responderError(res, error, 'routes/eliminar');
      }
    });

    app.get('/epik/:id/*', (req, res) => {
      const ruta = store.rutaArchivo(req.params.id, req.params[0]);
      if (!ruta || !fs.existsSync(ruta)) return res.status(404).end();
      res.set({
        'Content-Security-Policy': politicaEpik(req.headers.host),
        // El iframe tiene origen opaco: sin esto no cargaria sus propias fuentes. Son archivos del paquete, nada privado.
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      });
      res.sendFile(ruta);
    });

    mcpRegistry.registerTool({
      name: 'epik_list', domain: 'epik', readOnly: true,
      title: 'List .epik overlays',
      description: 'Custom overlay packages (.epik) installed in the active account, optionally filtered by overlay id (e.g. "musica", "likes"). Each .epik belongs to a family (manifest "overlay") and works in every overlay of that family. Includes each one\'s own settings fields.',
      inputSchema: { type: 'object', properties: { overlay: { type: 'string' } } },
      handler: ({ overlay } = {}) => ({ familias: store.FAMILIAS, epiks: store.listar(overlay, logger) }),
    });

    mcpRegistry.registerTool({
      name: 'epik_import', domain: 'epik',
      title: 'Import .epik overlay',
      description: 'Install or update a .epik overlay package from a local file path. Same id replaces the previous version and keeps the streamer settings. Then select it as the overlay skin "epik:<id>".',
      inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Absolute path of the .epik file' } }, required: ['path'] },
      handler: ({ path: ruta }) => {
        try {
          return importarBuffer(fs.readFileSync(ruta));
        } catch (error) {
          if (error instanceof store.ErrorEpik) return { ok: false, error: error.message, ...error.extra };
          throw error;
        }
      },
    });

    mcpRegistry.registerTool({
      name: 'epik_delete', domain: 'epik', destructive: true,
      title: 'Delete .epik overlay',
      description: 'Remove an installed .epik overlay package by id.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      handler: ({ id }) => {
        store.eliminar(id);
        avisarCambio();
        return { ok: true };
      },
    });

    return { rutas: 5, listeners: 0 };
  },
};
