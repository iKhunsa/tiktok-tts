'use strict';

// Integración con Aptabase (analytics de eventos de producto, self-hosted).
//
//  - init()   : arranca @aptabase/electron en el proceso main lo antes
//               posible y manda el evento app_started. Espeja el patrón de
//               glitchtip.js: se llama desde main.js antes de cargar server.js.
//  - attach() : traduce eventos del bus de dominios (log:entry / error:handled,
//               emitidos por core/logger.js desde la Fase 1) a trackEvent().
//               Mismo criterio que /telemetria: los dominios no conocen
//               Aptabase, solo loguean su evento de negocio.
//  - shutdown(): no-op. El SDK bufferea y hace flush solo (intervalo interno +
//               al cerrar la app); se deja por simetría con glitchtip/telemetria.
//
// El APP_KEY de Aptabase es una clave de INGESTA del lado del cliente — viaja
// dentro de la app distribuida, no es un secreto. Aun así se resuelve de
// APTABASE_APP_KEY (env) o de aptabase-config.json bakeado en el build, nunca
// hardcodeada. Para self-hosted (claves A-SH-*) el host es obligatorio.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let sdk = null;
try {
  sdk = require('@aptabase/electron/main');
} catch (_) {
  sdk = null;
}

const HOST_DEFECTO = 'https://aptabase.tiklivetts.es';
const CAP_ERRORES_SESION = 50;

const estado = {
  enabled: false,
  logger: null,
  erroresEnviados: 0,
  ultimoTts: null,   // { voice, chars } de sonido.tts.solicitado, para enriquecer .hablado
};

function leerJsonCampo(file, campo) {
  try {
    if (!fs.existsSync(file)) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))[campo];
    return (typeof value === 'string' && value.trim()) ? value.trim() : null;
  } catch (_) {
    return null;
  }
}

function resolverConfig() {
  const bundled = path.join(
    process.env.TIKTOK_RESOURCES_PATH || path.join(__dirname, '..'),
    'aptabase-config.json'
  );
  const appKey = (process.env.APTABASE_APP_KEY && process.env.APTABASE_APP_KEY.trim())
    || leerJsonCampo(bundled, 'appKey');
  const host = (process.env.APTABASE_HOST && process.env.APTABASE_HOST.trim())
    || leerJsonCampo(bundled, 'host')
    || HOST_DEFECTO;
  return { appKey, host };
}

// Rutas de home fuera de props (Aptabase no las sanea y expondrían el nombre
// de usuario de Windows). Mismo criterio que glitchtip.js#sanear.
function sanear(str) {
  if (!str) return str;
  let s = String(str);
  const ud = process.env.TIKTOK_USER_DATA_PATH;
  if (ud) s = s.split(ud).join('<userData>');
  s = s.replace(/[A-Za-z]:\\Users\\[^\\/:*?"<>|\r\n]+/g, 'C:\\Users\\<user>');
  s = s.replace(/\/(?:home|Users)\/[^/\s]+/g, '/home/<user>');
  return s;
}

function track(nombre, props) {
  if (!estado.enabled || !sdk) return;
  try {
    sdk.trackEvent(nombre, props || {});
  } catch (_) {
    // nunca romper la app por analytics
  }
}

function init({ logger } = {}) {
  estado.logger = logger || null;

  if (!sdk) {
    if (logger) logger.log(
      'info', 'electron-shell', 'electron-shell/aptabase.js#init', 'aptabase.sdk.ausente',
      'Dependencia @aptabase/electron no instalada — analytics desactivado', {}
    );
    return false;
  }

  const { appKey, host } = resolverConfig();
  if (!appKey) {
    if (logger) logger.log(
      'info', 'electron-shell', 'electron-shell/aptabase.js#init', 'aptabase.sin_app_key',
      'APTABASE_APP_KEY no configurado — analytics desactivado', {}
    );
    return false;
  }

  try {
    sdk.initialize(appKey, { host });
    estado.enabled = true;
  } catch (error) {
    if (logger) logger.log(
      'error', 'electron-shell', 'electron-shell/aptabase.js#init', 'aptabase.init.fallido',
      `No se pudo inicializar Aptabase: ${error.message}`, { error: error.message, stack: error.stack }
    );
    return false;
  }

  track('app_started', {
    version: app.getVersion(),
    empaquetado: Boolean(app.isPackaged),
  });

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/aptabase.js#init', 'aptabase.init.ok',
    'Aptabase activo', { host }
  );
  return true;
}

function attach(bus, logger) {
  if (!estado.enabled || !bus) return;
  estado.logger = logger || estado.logger;

  // Acción núcleo del producto: TTS generado. sonido.tts.solicitado trae
  // {voice, textLen}; sonido.tts.hablado (entrega OK) trae {voice, slow}. Se
  // cachea el request para adjuntar chars al evento de entrega.
  bus.on('log:entry', (e) => {
    try {
      if (!e || !e.event) return;

      if (e.event === 'sonido.tts.solicitado') {
        const d = e.data || {};
        estado.ultimoTts = {
          voice: String(d.voice || 'es').slice(0, 40),
          chars: Number(d.textLen) || 0,
        };
        return;
      }

      if (e.event === 'sonido.tts.hablado') {
        const d = e.data || {};
        const voice = String(d.voice || (estado.ultimoTts && estado.ultimoTts.voice) || 'es').slice(0, 40);
        const chars = (estado.ultimoTts && estado.ultimoTts.voice === voice)
          ? estado.ultimoTts.chars
          : 0;
        track('tts_generated', {
          voice,
          chars,
          slow: Boolean(d.slow),
        });
        estado.ultimoTts = null;
      }
    } catch (_) {
      // noop — nunca romper por analytics
    }
  });

  // Errores manejados. core/logger.js ya normaliza el payload a
  // {domain, function, event, message, ...} para nivel error/fatal.
  const reportarError = (payload) => {
    if (estado.erroresEnviados >= CAP_ERRORES_SESION) return;
    estado.erroresEnviados++;
    track('error_handled', {
      where: String((payload && (payload.domain || payload.event)) || 'desconocido').slice(0, 80),
      message: sanear(String((payload && payload.message) || '')).slice(0, 200),
    });
  };
  bus.on('error:handled', reportarError);
  bus.on('error:uncaught', reportarError);

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/aptabase.js#attach', 'aptabase.conector.enganchado',
    'Aptabase enganchado al bus', {}
  );
}

function shutdown() {
  // El SDK hace flush solo; se deja el método por simetría con los otros
  // conectores del electron-shell.
  return Promise.resolve();
}

module.exports = {
  init,
  attach,
  shutdown,
  get enabled() { return estado.enabled; },
};
