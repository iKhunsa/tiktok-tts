'use strict';

const { overlayAccess } = require('../../../core/overlay-access');
const { staticRoot } = require('../../../core/static-root');
const fs = require('fs');
const path = require('path');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { ensureDirSync } = require('../../../core/ensure-dir');

// Respaldo en disco de los ajustes de la interfaz de la cuenta (overlays, escenas y capas del editor de canvas).
// El renderer los guarda en localStorage; este archivo es la copia que no se pierde si ese almacen se limpia.
// Se guarda tal cual lo manda el renderer, junto con la marca de tiempo del guardado para saber cual copia es mas nueva.
const archivo = () => accountDataPath('ajustes-ui.json');

function getAjustesUi({ logger }) {
  return (_req, res) => {
    try {
      res.json(JSON.parse(fs.readFileSync(archivo(), 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.log('warn', 'configuracion', 'configuracion/routes/ajustes-ui.js#getAjustesUi', 'configuracion.ajustes_ui.ilegible', `No se pudo leer el respaldo de ajustes: ${error.message}`, { error: error.message });
      }
      res.json({ guardado: 0, datos: null });
    }
  };
}

function putAjustesUi({ logger }) {
  return (req, res) => {
    const { guardado, datos } = req.body || {};
    if (!Number.isFinite(guardado) || !datos || typeof datos !== 'object' || Array.isArray(datos)) {
      return res.status(400).json({ error: 'ajustes_invalidos' });
    }
    try {
      ensureDirSync(path.dirname(archivo()));
      atomicWriteFileSync(archivo(), JSON.stringify({ guardado, datos }));
      return res.json({ ok: true });
    } catch (error) {
      logger.log('error', 'configuracion', 'configuracion/routes/ajustes-ui.js#putAjustesUi', 'configuracion.ajustes_ui.fallo', `No se pudo guardar el respaldo de ajustes: ${error.message}`, { error: error.message });
      return res.status(500).json({ error: 'no_se_pudo_guardar' });
    }
  };
}

// Transicion al cambiar de escena en el enlace dinamico (se elige en el editor). Solo se acepta un nombre simple y una duracion acotada.
const acotar = (valor, minimo, maximo, defecto) => (Number.isFinite(valor) ? Math.min(maximo, Math.max(minimo, valor)) : defecto);

function transicionDe(datos) {
  const { tipo, duracion, invertir, color, stinger } = datos?.transicionEscena ?? {};
  return {
    tipo: typeof tipo === 'string' && /^[a-z0-9-]{1,40}$/.test(tipo) ? tipo : 'ninguna',
    duracion: acotar(duracion, 150, 3000, 600),
    invertir: invertir === true,
    color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000',
    // El stinger solo puede ser una imagen/video de la biblioteca de la app o una URL https/http.
    stinger: {
      src: typeof stinger?.src === 'string' && /^(https?:\/\/|\/imagenes\/)\S{1,500}$/.test(stinger.src) ? stinger.src : '',
      punto: acotar(stinger?.punto, 10, 90, 50),
    },
  };
}

// Version de la pagina del overlay de escena: si cambia (se actualizo la app), la Browser Source de OBS se recarga sola
// en vez de seguir con el codigo viejo en memoria.
function versionPagina() {
  try { return fs.statSync(path.join(staticRoot(), 'overlay-escena.html')).mtimeMs; } catch (_) { return 0; }
}

function getEscenaOverlay({ bus }) {
  return (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!overlayAccess(bus).pro) return res.status(403).json({ urls: [] });
    // ponytail: migracion. Las paginas de escena anteriores a v=2 no conocen las transiciones nuevas ni se recargan solas:
    // se les da una "escena" que recarga la pagina. Quitar cuando ya no queden Browser Sources de OBS con esa version.
    if (!req.query.v) return res.json({ urls: ['/overlay-recarga.html'] });
    try {
      const { datos } = JSON.parse(fs.readFileSync(archivo(), 'utf8'));
      const id = req.query.e === 'dinamica' ? datos?.escenaActivaId : req.query.e;
      const escenas = Array.isArray(datos?.escenas) ? datos.escenas : [];
      const guardadas = escenas.find((escena) => escena.id === id)?.urls;
      const urls = Array.isArray(guardadas) ? guardadas : [];
      return res.json({ urls: urls.filter((url) => typeof url === 'string' && /^\/overlay-(?!escena)[\w-]+\.html(\?|$)/.test(url)), escenaId: id ?? null, transicion: transicionDe(datos), build: versionPagina() });
    } catch (error) {
      return res.status(error.code === 'ENOENT' ? 404 : 500).json({ urls: [] });
    }
  };
}

module.exports = { getAjustesUi, putAjustesUi, getEscenaOverlay };
