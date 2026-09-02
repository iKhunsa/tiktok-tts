'use strict';

// Integración con Aptabase (analytics de eventos de producto, self-hosted).
//
//  - init()   : arranca @aptabase/electron en el proceso main lo antes posible
//               (debe correr ANTES de app.isReady() o el SDK se desactiva).
//               Manda `installacion` (una vez en la vida del usuario, vía marca
//               persistida), `app_updated` (si cambió la versión) y `app_started`.
//  - attach() : traduce eventos del bus de dominios (log:entry emitido por
//               core/logger.js + algunos eventos directos como canal:estado,
//               movil:comando) a trackEvent(). Los dominios NO conocen Aptabase:
//               loguean su evento de negocio y acá se mapea.
//  - shutdown(): manda `session_ended` (resumen de la sesión, todo bucketeado) y
//               espera los POST en vuelo con una carrera de tiempo. El SDK
//               v0.3.1 NO batchea ni flushea solo — cada trackEvent es su propio
//               POST inmediato — así que el flush lo hacemos acá a mano.
//
// El APP_KEY de Aptabase es una clave de INGESTA del lado del cliente — viaja
// dentro de la app distribuida, no es un secreto. Se resuelve de APTABASE_APP_KEY
// (env) o de aptabase-config.json bakeado en el build, nunca hardcodeada. Para
// self-hosted (claves A-SH-*) el host es obligatorio.
//
// Errores: NO van a Aptabase (los maneja GlitchTip con contexto rico). Acá solo
// se cuenta un agregado que sale como `errores` (bucket) en `session_ended`.

const { marcarInstalacion } = require('./install-marker');
const { bucket } = require('./bucket');

let sdk = null;
try {
  sdk = require('@aptabase/electron/main');
} catch (_) {
  sdk = null;
}

const HOST_DEFECTO = 'https://aptabase.tiklivetts.es';
// Tope defensivo de props por evento. session_ended es el más ancho (~14
// props de resumen); el resto usa 1-3.
const MAX_PROPS = 20;

// Plataformas que cuentan como "canal usado" en el resumen de sesión.
const PLATAFORMAS = new Set(['tiktok', 'twitch', 'youtube', 'kick', 'obs']);

const estado = {
  enabled: false,
  logger: null,
  bus: null,
  cfg: null,                    // { appVersion, isPackaged, isDebug, userDataDir }
  sesionInicio: 0,
  pendientes: new Set(),        // promesas de trackEvent en vuelo (para el race del shutdown)

  // acumuladores de sesión (→ props de session_ended)
  plataformasUsadas: new Set(),
  overlaysVistos: new Set(),
  ttsTotal: 0,
  musicaTotal: 0,
  soundpadTotal: 0,
  errorCount: 0,
  modMensajesFiltrados: 0,
  primerTtsEnviado: false,
};

// ── Config ─────────────────────────────────────────────────────────────────

function leerJsonCampo(file, campo) {
  try {
    const fs = require('fs');
    if (!fs.existsSync(file)) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))[campo];
    return (typeof value === 'string' && value.trim()) ? value.trim() : null;
  } catch (_) {
    return null;
  }
}

function resolverConfig() {
  const path = require('path');
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

// ── Saneo ──────────────────────────────────────────────────────────────────

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

// El SDK no valida ni recorta nada — lo hacemos acá. Solo string/number/boolean,
// strings saneadas y a 200 chars, tope de MAX_PROPS claves.
function sanearProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (Object.keys(out).length >= MAX_PROPS) break;
    if (typeof v === 'string') out[k] = sanear(v).slice(0, 200);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    // se descartan null/undefined/objetos
  }
  return out;
}

// ── Envío ──────────────────────────────────────────────────────────────────

function track(nombre, props) {
  if (!estado.enabled || !sdk) return Promise.resolve();
  let p;
  try {
    p = Promise.resolve(sdk.trackEvent(nombre, sanearProps(props)));
  } catch (_) {
    return Promise.resolve();
  }
  p = p.catch(() => {}); // nunca romper la app por analytics
  estado.pendientes.add(p);
  p.finally(() => estado.pendientes.delete(p));
  return p;
}

// Estado de config en runtime, vía contrato síncrono del bus (features/configuracion).
function getConfig() {
  let c = {};
  try {
    if (estado.bus) estado.bus.emit('config:get', (v) => { c = v || {}; });
  } catch (_) { /* noop */ }
  return c;
}

function construirResumenSesion() {
  const cfg = getConfig();
  const minutos = estado.sesionInicio ? Math.round((Date.now() - estado.sesionInicio) / 60000) : 0;
  return {
    duracion:      bucket(minutos, [5, 30, 120, 480]),
    plataformas:   [...estado.plataformasUsadas].sort().join(',') || 'ninguna',
    plataformas_n: estado.plataformasUsadas.size,
    tts_total:     bucket(estado.ttsTotal, [1, 10, 50, 200]),
    music_total:   bucket(estado.musicaTotal, [1, 10, 50, 200]),
    soundpad_total: bucket(estado.soundpadTotal, [1, 10, 50]),
    errores:       bucket(estado.errorCount, [1, 5, 20]),
    mod_filtrados: bucket(estado.modMensajesFiltrados, [1, 10, 100]),
    musica:        Boolean(cfg.musicEnabled),
    playlist:      Boolean(cfg.playlistEnabled),
    filtro_idioma: Boolean(cfg.langFilterEnabled),
    filtro_dict:   Boolean(cfg.dictFilterEnabled),
    rate_limit:    Boolean(cfg.rateLimitEnabled),
    voz:           String(cfg.ttsVoiceLang || 'es').slice(0, 12),
  };
}

// ── init ───────────────────────────────────────────────────────────────────

function init({ appVersion, isPackaged, isDebug, userDataDir, logger } = {}) {
  estado.logger = logger || null;
  estado.cfg = {
    appVersion: appVersion || null,
    isPackaged: Boolean(isPackaged),
    isDebug: Boolean(isDebug),
    userDataDir: userDataDir || null,
  };

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

  estado.sesionInicio = Date.now();

  // Marca de instalación: `primera` es true una sola vez en la vida del usuario.
  let inst = { primera: false, actualizada: false, desde: null };
  if (estado.cfg.userDataDir) {
    inst = marcarInstalacion(estado.cfg.userDataDir, estado.cfg.appVersion, 'aptabase-instalacion.json');
  }

  if (inst.primera) {
    // Conteo diario de `installacion` en el dashboard = instalaciones únicas de
    // por vida (Aptabase no tiene id de cliente; la marca persistida garantiza 1).
    track('installacion', {
      version: estado.cfg.appVersion || '',
      os: process.platform,
      arch: process.arch,
    });
  } else if (inst.actualizada) {
    track('app_updated', {
      version: estado.cfg.appVersion || '',
      desde: inst.desde || '',
    });
  }

  track('app_started', {
    version: estado.cfg.appVersion || '',
    empaquetado: estado.cfg.isPackaged,
  });

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/aptabase.js#init', 'aptabase.init.ok',
    'Aptabase activo', { host, primera_instalacion: inst.primera }
  );
  return true;
}

// ── attach ─────────────────────────────────────────────────────────────────

function attach(bus, logger) {
  if (!estado.enabled || !bus) return;
  estado.bus = bus;
  estado.logger = logger || estado.logger;

  // Fuente principal: el espejo de logs (core/logger.js emite TODO log como
  // log:entry). Cada dominio loguea su evento de negocio; acá se mapea.
  bus.on('log:entry', (e) => {
    try {
      if (!e || !e.event) return;
      const d = e.data || {};

      switch (e.event) {
        // ── TTS ──────────────────────────────────────────────────────────
        case 'sonido.tts.hablado': {
          estado.ttsTotal++;
          if (!estado.primerTtsEnviado) {
            estado.primerTtsEnviado = true;
            track('first_tts', { voice: String(d.voice || 'es').slice(0, 12) });
          }
          break;
        }

        // ── Música ───────────────────────────────────────────────────────
        case 'sonido.musica.solicitud_recibida': {
          estado.musicaTotal++;
          track('music_requested', { platform: String(d.platform || '').slice(0, 20) });
          break;
        }

        // ── Soundpad (Fase 3) ────────────────────────────────────────────
        case 'sonido.soundpad.reproducido': {
          estado.soundpadTotal++;
          break;
        }

        // ── Overlays ─────────────────────────────────────────────────────
        case 'overlay.fondo.subido': {
          const kb = Number(d.size) ? Math.round(Number(d.size) / 1024) : 0;
          track('overlay_bg_uploaded', { size_kb: kb });
          break;
        }

        // ── Clips ────────────────────────────────────────────────────────
        case 'clips.marcado.exitoso': {
          track('clip_marked', { origen: String(d.origen || 'desconocido').slice(0, 20) });
          break;
        }

        // ── Config ───────────────────────────────────────────────────────
        case 'configuracion.patch.aplicado': {
          const keys = Array.isArray(d.keysChanged) ? d.keysChanged.slice(0, 20) : [];
          for (const k of keys) {
            const key = String(k || '').slice(0, 40);
            if (!key) continue;
            track('config_changed', { key });           // NUNCA el valor (regla del dominio)
            if (key === 'ttsVoiceLang') track('voice_changed', { key });
          }
          break;
        }

        // ── Moderación ───────────────────────────────────────────────────
        case 'moderacion.filtro.mensaje_bloqueado': {
          estado.modMensajesFiltrados++;
          break;
        }
        case 'moderacion.palabras.guardado': {
          track('mod_words_saved', { count: Math.max(0, Math.min(99999, Number(d.count) || 0)) });
          break;
        }
        case 'moderacion.accion.fallida': {
          track('moderation_action_failed', { platform: String(d.platform || '').slice(0, 20) });
          break;
        }
        case 'moderacion.accion.aplicada': { // Fase 3
          track('moderation_action', {
            platform: String(d.platform || '').slice(0, 20),
            accion: String(d.accion || '').slice(0, 20),
          });
          break;
        }

        // ── Promo ────────────────────────────────────────────────────────
        case 'promo.autopromocion.disparada': {
          track('promo_fired', {});
          break;
        }

        default:
          break;
      }
    } catch (_) {
      // nunca romper por analytics
    }
  });

  // Estado de canales: activación (platform_connected / platform_connect_failed)
  // + acumulador de plataformas usadas para el resumen.
  bus.on('canal:estado', (p) => {
    try {
      if (!p || !PLATAFORMAS.has(p.platform)) return;
      if (p.state === 'conectado') {
        if (!estado.plataformasUsadas.has(p.platform)) {
          estado.plataformasUsadas.add(p.platform);
          track('platform_connected', { platform: p.platform });
        }
      } else if (p.state === 'error') {
        track('platform_connect_failed', {
          platform: p.platform,
          motivo: sanear(String(p.error || 'desconocido')).slice(0, 80),
        });
      }
    } catch (_) { /* noop */ }
  });

  // Overlays abiertos en OBS — primero por slug por sesión.
  bus.on('overlay:opened', (p) => {
    try {
      const slug = p && String(p.overlay || '').slice(0, 30);
      if (!slug || estado.overlaysVistos.has(slug)) return;
      estado.overlaysVistos.add(slug);
      track('overlay_opened', { overlay: slug });
    } catch (_) { /* noop */ }
  });

  // Panel móvil.
  bus.on('movil:emparejado', () => {
    try { track('mobile_paired', {}); } catch (_) { /* noop */ } // sin ip (PII)
  });
  bus.on('movil:comando', (p) => {
    try {
      const action = p && String(p.action || '').slice(0, 30);
      if (action) track('mobile_command', { action });
    } catch (_) { /* noop */ }
  });

  // Reporte de bug manual.
  bus.on('reporte-bug:enviado', (p) => {
    try {
      track('bug_report_sent', {
        canal: String((p && p.canal) || '').slice(0, 60),   // sin descripcion/extra (texto libre)
        version: String((p && p.version) || '').slice(0, 20),
      });
    } catch (_) { /* noop */ }
  });

  // Idioma de UI (Fase 3 — llega del renderer vía IPC telemetry:track).
  bus.on('ui:language-set', (lang) => {
    try {
      const code = String(lang || '').toLowerCase().slice(0, 8);
      if (/^[a-z-]{2,8}$/.test(code)) track('ui_language_set', { lang: code });
    } catch (_) { /* noop */ }
  });

  // Errores → solo se cuentan (GlitchTip los maneja con contexto). El conteo
  // sale como `errores` (bucket) en session_ended.
  const contarError = () => { estado.errorCount++; };
  bus.on('error:handled', contarError);
  bus.on('error:uncaught', contarError);

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/aptabase.js#attach', 'aptabase.conector.enganchado',
    'Aptabase enganchado al bus', {}
  );
}

// ── shutdown ───────────────────────────────────────────────────────────────

// El SDK no flushea al cerrar: acá mandamos session_ended y esperamos los POST
// en vuelo con una carrera de tiempo. Lo llama main.js#before-quit dentro de un
// Promise.allSettled, con event.preventDefault() para posponer el quit.
async function shutdown({ timeoutMs = 1500 } = {}) {
  if (!estado.enabled) return;
  try {
    await track('session_ended', construirResumenSesion());
  } catch (_) { /* noop */ }
  const pendientes = Promise.allSettled([...estado.pendientes]);
  await Promise.race([
    pendientes,
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

module.exports = {
  init,
  attach,
  shutdown,
  get enabled() { return estado.enabled; },
};
