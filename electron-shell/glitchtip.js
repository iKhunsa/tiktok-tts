'use strict';

// Integración con GlitchTip (error tracking self-hosted, compatible con Sentry).
//
//  - init()   : arranca @sentry/electron en el proceso main. Captura crashes
//               del main, del proceso (uncaughtException / unhandledRejection) y
//               los minidumps nativos. Se llama lo antes posible desde main.js.
//  - attach() : traduce los errores del bus de dominios (log:entry nivel
//               error/fatal + una lista de warn, emitidos por core/logger.js) a
//               issues de GlitchTip, con tags legibles en español, y deja
//               breadcrumbs de la actividad del usuario para que cada issue
//               muestre "qué venía pasando" antes del fallo.
//  - shutdown(): flush antes de cerrar.
//
// El DSN es una clave de INGESTA del lado del cliente. Los DSN de Sentry están
// diseñados para viajar dentro de apps distribuidas — NO son secretos (ver
// docs de Sentry). Igual se puede override con SENTRY_DSN / GLITCHTIP_DSN (env)
// o con glitchtip.json en userData.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { marcarInstalacion: marcarInstalacionCompartida } = require('./install-marker');

let Sentry = null;
try {
  Sentry = require('@sentry/electron/main');
} catch (_) {
  Sentry = null;
}

const DSN_DEFECTO = 'https://4e97e8317d6f424881240d743d6287ea@glitchtip.tiklivetts.es/1';

const estado = {
  enabled: false,
  logger: null,
  bus: null,
  sesionInicio: Date.now(),
  plataformasConectadas: new Set(),
  obsConectado: false,
  issuesEnviados: 0,
  capAvisado: false,
  erroresRecientes: [],            // timestamps para detectar "sesión problemática"
  sesionProblematicaAvisada: false,
};

const CAP_ISSUES_SESION = 60;
const SENTRY_NIVEL = { debug: 'debug', info: 'info', warn: 'warning', error: 'error', fatal: 'fatal' };

// Eventos de logger que NO valen como breadcrumb (alta frecuencia / ya se
// capturan como issue / ruido de infra).
const RUIDO_BREADCRUMB = new Set([
  'chat.mensaje.emitido', 'chat.mensaje.recibido', 'chat.test.inyectado',
  'sonido.tts.solicitado', 'sonido.tts.hablado',
  'overlay.test.disparado', 'promo.autopromocion.disparada',
  'configuracion.log_cliente.recibido',
  'core.ws.cliente_conectado', 'core.ws.cliente_desconectado',
  'core.broadcast.envio_fallido', 'core.ws.mensaje_invalido',
]);

function resolverDsn(userDataDir) {
  if (process.env.SENTRY_DSN && process.env.SENTRY_DSN.trim()) return process.env.SENTRY_DSN.trim();
  if (process.env.GLITCHTIP_DSN && process.env.GLITCHTIP_DSN.trim()) return process.env.GLITCHTIP_DSN.trim();
  try {
    const f = path.join(userDataDir || app.getPath('userData'), 'glitchtip.json');
    const v = JSON.parse(fs.readFileSync(f, 'utf8')).dsn;
    if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim();
  } catch (_) { /* no existe */ }
  return DSN_DEFECTO;
}

// event de core/logger.js → errorType legible en español. Se usa como
// fingerprint: agrupa el issue por este nombre en el panel de GlitchTip.
const EVENTO_A_TIPO = {
  'core.http.puerto_en_uso': 'error_arranque',
  'core.http.error_listen': 'error_arranque',
  'core.dominio.fallo_montaje': 'error_dominio_no_monta',
  'core.bus.listener_fallido': 'error_listener_bus',
  'core.dominio.fallo_apagado': 'error_apagado',
  'core.boundary.excepcion_capturada': 'error_no_capturado',
  'core.ruta.excepcion': 'error_ruta_http',
  'core.ws.servidor_error': 'error_websocket',
  'core.ws.socket_error': 'error_websocket',
  'core.logger.escritura_fallida': 'error_logger',
  'canales.conexion.fallida': 'error_conexion_plataforma',
  'canales.desconexion.fallida': 'error_conexion_plataforma',
  'canales.tiktok.conexion_fallida': 'error_conexion_tiktok',
  'canales.tiktok.error': 'error_conexion_tiktok',
  'canales.tiktok.timeout_conexion': 'error_conexion_tiktok',
  'canales.tiktok.reconexion_fallida': 'error_reconexion_agotada',
  'canales.twitch.reconexion_fallida': 'error_conexion_twitch',
  'canales.twitch.cliente_error': 'error_conexion_twitch',
  'canales.twitch_eventsub.socket_error': 'error_conexion_twitch',
  'canales.twitch_eventsub.suscripcion_fallida': 'error_conexion_twitch',
  'canales.twitch_eventsub.suscripcion_revocada': 'error_conexion_twitch',
  'canales.twitch_eventsub.reconexion_fallida': 'error_conexion_twitch',
  'canales.twitch_eventsub.reconexion_agotada': 'error_reconexion_agotada',
  'canales.twitch_oauth.reanudacion_fallida': 'error_twitch_oauth',
  'canales.youtube.reconexion_fallida': 'error_conexion_youtube',
  'canales.youtube.error': 'error_conexion_youtube',
  'canales.youtube.chat_estancado': 'error_chat_estancado',
  'canales.kick.sin_eventos': 'error_chat_estancado',
  'canales.kick.socket_error': 'error_conexion_kick',
  'canales.kick.reconexion_fallida': 'error_conexion_kick',
  'canales.kick.reconexion_agotada': 'error_reconexion_agotada',
  'canales.obs.conexion_fallida': 'error_conexion_obs',
  'canales.obs.replay_fallido': 'error_conexion_obs',
  'canales.obs.reconexion_agotada': 'error_reconexion_agotada',
  'canales.twitch_oauth.tokens_guardado_fallido': 'error_twitch_oauth',
  'canales.twitch_oauth.refresh_fallido': 'error_twitch_oauth',
  'canales.twitch_oauth.tokens_carga_fallida': 'error_twitch_oauth',
  'sonido.tts.error_google_http': 'error_tts_google',
  'sonido.tts.error_google_timeout': 'error_tts_google',
  'sonido.tts.error_google_red': 'error_tts_google',
  'sonido.musica.motor_no_disponible': 'error_musica_engine',
  'sonido.musica.stream_error': 'error_musica_engine',
  'sonido.musica.busqueda_fallida': 'error_musica_engine',
  'sonido.musica.info_fallida': 'error_musica_engine',
  'sonido.musica.playlist_streamer_fallida': 'error_playlist',
  'sonido.musica.playlist_track_salteado': 'error_playlist',
  'sonido.tts.respuesta_pequena': 'error_tts_google',
  'moderacion.store.guardado_fallido': 'error_moderacion_store',
  'moderacion.store.lectura_fallida': 'error_moderacion_store',
  'moderacion.store.apartado_por_corrupcion': 'error_moderacion_store',
  'moderacion.store.backup_fallido': 'error_moderacion_store',
  'moderacion.palabras.carga_fallida': 'error_palabras_bloqueadas',
  'moderacion.palabras.guardado_fallido': 'error_palabras_bloqueadas',
  'moderacion.palabras.export_fallido': 'error_palabras_bloqueadas',
  'moderacion.policy.fallo_evaluacion': 'error_evaluacion_moderacion',
  'moderacion.accion.fallida': 'error_moderacion_accion',
  'chat.policy_fallo_evaluacion': 'error_evaluacion_moderacion',
  'configuracion.store.guardado_fallido': 'error_config_guardado',
  'configuracion.platform.guardado_fallido': 'error_config_guardado',
  'configuracion.store.carga_fallida': 'error_config_carga',
  'configuracion.platform.carga_fallida': 'error_config_carga',
  'configuracion.logs.lectura_dir_fallida': 'error_config_logs',
  'configuracion.logs.lectura_sesion_fallida': 'error_config_logs',
  'configuracion.log_cliente.recibido': 'error_interfaz',
  'electron_shell.updater.error': 'error_actualizacion',
  'electron_shell.updater.chequeo_fallido': 'error_actualizacion',
  'electron_shell.tray.creacion_fallida': 'error_bandeja',
  'electron_shell.shortcut.registro_fallido': 'error_atajo_global',
  'electron_shell.atajo_clip_fallido': 'error_atajo_global',
  'movil.qr.generacion_fallida': 'error_qr_movil',
  'overlay.fondo.borrado_fallido': 'error_overlay_fondo',
  'reporte_bug.discord.envio_fallido': 'error_reporte_bug_discord',
  'reporte_bug.envio_fallido': 'error_reporte_bug_discord',
  'promo.autopromocion.fallo_callback': 'error_autopromo',
  'clips.marcado.fallido': 'error_clip_no_marcado',
  'idioma.dict.carga_fallida': 'error_diccionario_idioma',
};

// warn que se promueven a issue (fallos que el usuario sí sufre — se le corta
// el chat, se rompe yt-dlp — pero que el código loguea como warn).
const WARN_PROMOVIDOS = new Set([
  'canales.obs.reconexion_agotada',
  'canales.tiktok.reconexion_fallida',
  'canales.tiktok.error',
  'canales.tiktok.timeout_conexion',
  'canales.twitch_eventsub.reconexion_agotada',
  'canales.twitch_eventsub.socket_error',
  'canales.twitch_eventsub.suscripcion_fallida',
  'canales.twitch_oauth.refresh_fallido',
  'canales.twitch_oauth.tokens_carga_fallida',
  'canales.youtube.chat_estancado',
  'canales.youtube.error',
  'canales.kick.sin_eventos',
  'canales.kick.socket_error',
  'canales.kick.reconexion_agotada',
  'canales.twitch_eventsub.suscripcion_revocada',
  'canales.twitch_eventsub.reconexion_fallida',
  'canales.twitch_oauth.reanudacion_fallida',
  'canales.obs.conexion_fallida',
  'sonido.musica.motor_no_disponible',
  'sonido.musica.stream_error',
  'sonido.musica.busqueda_fallida',
  'sonido.musica.info_fallida',
  'sonido.musica.playlist_streamer_fallida',
  'sonido.tts.respuesta_pequena',
  'configuracion.store.carga_fallida',
  'configuracion.platform.carga_fallida',
  'configuracion.logs.lectura_dir_fallida',
  'configuracion.logs.lectura_sesion_fallida',
  'moderacion.store.lectura_fallida',
  'promo.autopromocion.fallo_callback',
  'reporte_bug.envio_fallido',
  'electron_shell.updater.chequeo_fallido',
  'electron_shell.shortcut.registro_fallido',
  'electron_shell.atajo_clip_fallido',
  'idioma.dict.carga_fallida',
]);

// Rutas de home fuera del mensaje/stack — GlitchTip no las sanea y expondrían
// el nombre de usuario de Windows.
function sanear(str) {
  if (!str) return str;
  let s = String(str);
  const ud = process.env.TIKTOK_USER_DATA_PATH;
  if (ud) s = s.split(ud).join('<userData>');
  s = s.replace(/[A-Za-z]:\\Users\\[^\\/:*?"<>|\r\n]+/g, 'C:\\Users\\<user>');
  s = s.replace(/\/(?:home|Users)\/[^/\s]+/g, '/home/<user>');
  return s;
}

// Cola del log de sesión como texto (para meterla en el context del issue —
// GlitchTip no guarda attachments). Lectura directa del tail, saneada.
function colaLog(logger, maxBytes = 12 * 1024) {
  try {
    const p = logger && logger.getSessionLogPath && logger.getSessionLogPath();
    if (!p) return null;
    const stat = fs.statSync(p);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(p, 'r');
    try {
      const buf = Buffer.alloc(stat.size - start);
      if (buf.length) fs.readSync(fd, buf, 0, buf.length, start);
      return sanear(buf.toString('utf8')).slice(-maxBytes);
    } finally {
      fs.closeSync(fd);
    }
  } catch (_) {
    return null;
  }
}

// Foto del estado de la app al momento de un error.
function estadoApp() {
  let config = null;
  try { if (estado.bus) estado.bus.emit('config:get', (c) => { config = c; }); } catch (_) { /* noop */ }
  return {
    plataformas_conectadas: [...estado.plataformasConectadas].join(', ') || 'ninguna',
    obs_conectado: estado.obsConectado,
    minutos_sesion: Math.round((Date.now() - estado.sesionInicio) / 60000),
    voz_tts: (config && config.ttsVoiceLang) || null,
    musica: config ? Boolean(config.musicEnabled) : null,
    playlist: config ? Boolean(config.playlistEnabled) : null,
    filtro_idioma: config ? Boolean(config.langFilterEnabled) : null,
    filtro_diccionario: config ? Boolean(config.dictFilterEnabled) : null,
    limite_mensajes: config ? Boolean(config.rateLimitEnabled) : null,
  };
}

function recortarData(data) {
  if (!data || typeof data !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'stack') continue;
    if (typeof v === 'string') out[k] = sanear(v).slice(0, 300);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function marcarInstalacion(userDataDir, appVersion) {
  // Delega en el helper compartido (electron-shell/install-marker.js). Aptabase
  // usa el mismo helper con su propio archivo.
  return marcarInstalacionCompartida(userDataDir, appVersion, 'glitchtip-instalacion.json');
}

function init({ appVersion, isDebug, userDataDir, logger }) {
  estado.logger = logger || null;
  if (!Sentry) {
    if (logger) logger.log(
      'info', 'electron-shell', 'electron-shell/glitchtip.js#init', 'glitchtip.sdk.ausente',
      'Dependencia @sentry/electron no instalada — error tracking desactivado', {}
    );
    return false;
  }

  const dsn = resolverDsn(userDataDir);
  if (!dsn) return false;

  try {
    Sentry.init({
      dsn,
      release: `tiktok-tts@${appVersion || '0'}`,
      environment: isDebug ? 'dev' : 'production',
      tracesSampleRate: 0.05,   // Fase 8 — muestreo minimo de performance
      enableLogs: true,          // Fase 7 — seccion Logs de GlitchTip
      maxBreadcrumbs: 150,       // Fase 1 — trail largo de eventos antes del fallo
      beforeSend(event) {
        if (event.message) event.message = sanear(event.message);
        if (event.exception && Array.isArray(event.exception.values)) {
          for (const v of event.exception.values) {
            if (v && v.value) v.value = sanear(v.value);
          }
        }
        return event;
      },
    });
    estado.enabled = true;

    // Fase 8 — inyecta el tracing real en el contrato de performance. Los
    // dominios llaman perf.span(...) sin saber de Sentry.
    try {
      const perf = require('../core/contracts/perf');
      perf.span = (name, attributes, fn) => Sentry.startSpan({ name, attributes: attributes || undefined }, fn);
    } catch (_) { /* si falla, el contrato queda en passthrough */ }
  } catch (error) {
    if (logger) logger.log(
      'error', 'electron-shell', 'electron-shell/glitchtip.js#init', 'glitchtip.init.fallido',
      `No se pudo inicializar GlitchTip: ${error.message}`, { error: error.message, stack: error.stack }
    );
    return false;
  }

  try {
    const m = marcarInstalacion(userDataDir || app.getPath('userData'), appVersion);
    Sentry.setContext('instalacion', {
      primera_apertura: m.primera,
      actualizada_desde: m.actualizada ? m.desde : null,
      version: appVersion || null,
    });
    Sentry.setTag('primera_apertura', m.primera ? 'si' : 'no');
  } catch (_) { /* best-effort */ }

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/glitchtip.js#init', 'glitchtip.init.ok',
    'GlitchTip activo', { release: `tiktok-tts@${appVersion || '0'}`, environment: isDebug ? 'dev' : 'production' }
  );
  return true;
}

function reportarIssue(e, logger) {
  const esError = e.level === 'error' || e.level === 'fatal';
  const esWarnPromovido = e.level === 'warn' && WARN_PROMOVIDOS.has(e.event);
  if (!esError && !esWarnPromovido) return;

  if (estado.issuesEnviados >= CAP_ISSUES_SESION) {
    if (!estado.capAvisado) {
      estado.capAvisado = true;
      if (logger) logger.log(
        'warn', 'electron-shell', 'electron-shell/glitchtip.js#reportarIssue', 'glitchtip.cap_sesion',
        `Se alcanzó el cap de ${CAP_ISSUES_SESION} issues por sesión`, {}
      );
    }
    return;
  }

  let tipo = EVENTO_A_TIPO[e.event];
  if (!tipo) {
    if (!esError) return;
    tipo = `error_${String(e.domain || 'desconocido').replace(/[^a-z_]/gi, '_')}`;
  }
  const esRenderer = e.event === 'configuracion.log_cliente.recibido';
  const src = esRenderer ? String((e.data && e.data.source) || 'principal') : null;
  if (esRenderer && src.startsWith('overlay:')) tipo = 'error_overlay';

  const mensaje = e.event.startsWith('canales.')
    ? `[${e.event}] ${(e.data && e.data.error) || 'fallo de conexión'}`
    : `[${e.event}] ${e.message}`;

  const err = new Error(sanear(mensaje));
  err.name = tipo;
  const stack = e.stack || (e.data && e.data.stack);
  if (stack) err.stack = `${tipo}: ${sanear(mensaje)}\n${sanear(String(stack))}`;

  // Fase 4 — logs locales de la UI que vinieron con el error del renderer.
  if (esRenderer && Array.isArray(e.data && e.data.recientes)) {
    for (const r of e.data.recientes) {
      try {
        Sentry.addBreadcrumb({
          category: `ui:${(r && r.source) || 'client'}`,
          message: sanear(String((r && r.message) || '')).slice(0, 300),
          level: SENTRY_NIVEL[r && r.level] || 'info',
        });
      } catch (_) { /* noop */ }
    }
  }

  const contexts = {
    detalle: { funcion: e.function || null, fuente: src || null },
    estado_app: estadoApp(),
  };
  const cola = colaLog(logger);
  if (cola) contexts.log_cola = { texto: cola };

  Sentry.captureException(err, {
    level: e.level === 'fatal' ? 'fatal' : (esWarnPromovido ? 'warning' : 'error'),
    tags: {
      dominio: e.domain || 'desconocido',
      evento: e.event,
      origen: esRenderer ? (src.startsWith('overlay:') ? 'overlay' : 'ventana') : 'backend',
    },
    fingerprint: [tipo],
    contexts,
  });
  estado.issuesEnviados++;

  // Fase 6 — "sesión problemática": muchos errores en poco tiempo
  const ahora = Date.now();
  estado.erroresRecientes.push(ahora);
  estado.erroresRecientes = estado.erroresRecientes.filter((t) => ahora - t < 5 * 60 * 1000);
  if (estado.erroresRecientes.length > 10 && !estado.sesionProblematicaAvisada) {
    estado.sesionProblematicaAvisada = true;
    Sentry.captureMessage('Sesión con muchos errores en poco tiempo', {
      level: 'warning',
      tags: { tipo: 'sesion_problematica' },
      contexts: { estado_app: estadoApp() },
    });
  }
}

function attach(bus, logger) {
  if (!estado.enabled || !bus || !Sentry) return;
  estado.bus = bus;

  // Estado de plataformas/OBS: alimenta el tag canal_* y el context de cada issue.
  bus.on('canal:estado', (p) => {
    try {
      if (!p) return;
      if (['tiktok', 'twitch', 'youtube', 'kick'].includes(p.platform)) {
        const clave = `${p.platform}:${p.channel || ''}`;
        if (p.state === 'conectado') {
          estado.plataformasConectadas.add(clave);
          Sentry.setTag(`canal_${p.platform}`, String(p.channel || ''));
        } else if (p.state === 'desconectado') {
          estado.plataformasConectadas.delete(clave);
        }
      } else if (p.platform === 'obs') {
        if (p.state === 'conectado') estado.obsConectado = true;
        else if (p.state === 'desconectado') estado.obsConectado = false;
      }
    } catch (_) { /* noop */ }
  });

  // Fuente única: el espejo de logs. Cada entrada → breadcrumb (Fase 1) +
  // sección Logs si es warn+ (Fase 7) + issue si es error / warn-promovido.
  bus.on('log:entry', (e) => {
    try {
      if (!e || !e.event) return;
      if (/^(glitchtip|telemetria|aptabase)\./.test(e.event) || e.event.startsWith('reporte_bug.error')) return;

      const nivel = SENTRY_NIVEL[e.level] || 'info';

      // Fase 1 — breadcrumb (salvo ruido de alta frecuencia)
      if (!RUIDO_BREADCRUMB.has(e.event)) {
        Sentry.addBreadcrumb({
          category: e.domain || 'app',
          message: `${e.event} — ${e.message}`.slice(0, 300),
          level: nivel,
          data: recortarData(e.data),
        });
      }

      // Fase 7 — sección Logs: warn y arriba
      if ((e.level === 'warn' || e.level === 'error' || e.level === 'fatal') && Sentry.logger) {
        const fn = Sentry.logger[nivel] || Sentry.logger.warn;
        try {
          fn(sanear(String(e.message || e.event)), {
            dominio: e.domain || 'desconocido',
            evento: e.event,
            funcion: e.function || undefined,
            ...(recortarData(e.data) || {}),
          });
        } catch (_) { /* noop */ }
      }

      reportarIssue(e, logger);
    } catch (_) { /* nunca romper por el error tracker */ }
  });

  // Fase 3 — el botón "Reportar bug" también a GlitchTip
  bus.on('reporte-bug:enviado', (p) => {
    try {
      const cola = colaLog(logger, 24 * 1024);
      Sentry.captureMessage(`Reporte manual: ${(p && p.descripcion) || 'sin descripción'}`.slice(0, 400), {
        level: 'info',
        tags: { tipo: 'reporte_manual', canal: (p && p.canal) || 'desconocido' },
        contexts: {
          estado_app: estadoApp(),
          reporte: { extra: (p && p.extra) || null, version: (p && p.version) || null },
          ...(cola ? { log_cola: { texto: cola } } : {}),
        },
      });
    } catch (_) { /* noop */ }
  });

  if (logger) logger.log(
    'info', 'electron-shell', 'electron-shell/glitchtip.js#attach', 'glitchtip.conector.enganchado',
    'GlitchTip enganchado al bus', {}
  );
}

async function shutdown() {
  if (!estado.enabled || !Sentry) return;
  try { await Sentry.close(1500); } catch (_) { /* best-effort */ }
}

module.exports = {
  init,
  attach,
  shutdown,
  get enabled() { return estado.enabled; },
};
