'use strict';

// Obtiene el MP3 de un texto para TTS con tres capas de resiliencia frente a
// Google Translate TTS (endpoint gratis, sin API key, que rate-limitea el IP
// devolviendo 200 + body vacio):
//
//  1. CACHE en disco — frases que se repiten (saludos, nombres de regalos,
//     nicks) se leen una sola vez de Google; despues salen del archivo. Menos
//     peticiones = menos rate-limit + respuesta instantanea.
//  2. RETRY — hasta 2 reintentos ante body vacio / error de red / timeout
//     (fallos transitorios). Los HTTP 4xx no se reintentan.
//  3. BACKOFF — si Google falla en serie, se deja de pegarle: 3 fallos
//     seguidos → pausa 5s, despues 15s, despues 60s. Mientras esta en pausa,
//     falla rapido sin tocar la red. Un exito resetea todo.
//
// La cache vive en DATA_BASE/tts-cache (userData), con poda por cantidad.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const zlib = require('zlib');
const gTTS = require('google-tts-api');
const { DATA_BASE } = require('../../../core/paths');
const { GOOGLE_TTS_LANGS } = require('./langs');

const CACHE_DIR = path.join(DATA_BASE, 'tts-cache');
const CACHE_MAX_FILES = 600;         // techo antes de podar
const CACHE_PRUNE_TO = 450;          // a cuanto baja al podar
const MIN_AUDIO_BYTES = 1024;        // menos que esto = respuesta vacia/basura
const MAX_ATTEMPTS = 3;              // 1 intento + 2 reintentos
const RETRY_DELAY_MS = 400;
const HTTP_TIMEOUT_MS = 15000;

// Backoff — estado a nivel modulo (una sola instancia de TTS por proceso).
const BACKOFF_STEPS_MS = [5000, 15000, 60000];
const BACKOFF_AFTER_FAILS = 3;
const backoff = { fallosSeguidos: 0, pausadoHasta: 0 };

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function claveCache(texto, lang, slow) {
  return crypto.createHash('sha1').update(`${lang}|${slow ? 1 : 0}|${texto}`).digest('hex');
}

function leerCache(clave) {
  try {
    const p = path.join(CACHE_DIR, `${clave}.mp3`);
    const buf = fs.readFileSync(p);
    if (buf.length >= MIN_AUDIO_BYTES) {
      // touch para que la poda por mtime la considere reciente
      const now = new Date();
      try { fs.utimesSync(p, now, now); } catch (_) { /* noop */ }
      return buf;
    }
  } catch (_) { /* no existe */ }
  return null;
}

function escribirCache(clave, buffer) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const final = path.join(CACHE_DIR, `${clave}.mp3`);
    const tmp = `${final}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, final);
    podarCache();
  } catch (_) { /* best-effort — la cache es opcional */ }
}

let podaEnCurso = false;
function podarCache() {
  if (podaEnCurso) return;
  podaEnCurso = true;
  // async y best-effort: no bloquea la respuesta
  fs.promises.readdir(CACHE_DIR)
    .then(async (nombres) => {
      const mp3 = nombres.filter((n) => n.endsWith('.mp3'));
      if (mp3.length <= CACHE_MAX_FILES) return;
      const conMtime = await Promise.all(mp3.map(async (n) => {
        const st = await fs.promises.stat(path.join(CACHE_DIR, n)).catch(() => null);
        return st ? { n, mtime: st.mtimeMs } : null;
      }));
      const ordenadas = conMtime.filter(Boolean).sort((a, b) => a.mtime - b.mtime);
      const aBorrar = ordenadas.slice(0, Math.max(0, ordenadas.length - CACHE_PRUNE_TO));
      await Promise.all(aBorrar.map((e) => fs.promises.unlink(path.join(CACHE_DIR, e.n)).catch(() => {})));
    })
    .catch(() => {})
    .finally(() => { podaEnCurso = false; });
}

// Un intento contra Google. Resuelve con Buffer o rechaza con { code }.
function pedirAGoogle(texto, lang, slow, signal = null) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject({ code: 'ABORTED' }); return; }

    let url;
    try {
      url = gTTS.getAudioUrl(texto, { lang, slow, host: 'https://translate.google.com' });
    } catch (err) {
      reject({ code: 'URL', message: err.message });
      return;
    }

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip, deflate' } }, (resp) => {
      const status = resp.statusCode || 0;
      const ct = resp.headers['content-type'] || '';

      if (status !== 200) {
        let body = '';
        resp.on('data', (c) => { if (body.length < 500) body += c.toString(); });
        resp.on('end', () => reject({ code: status >= 400 && status < 500 ? 'HTTP4XX' : 'HTTP', status, body: body.slice(0, 300), contentType: ct }));
        return;
      }
      if (!ct.includes('audio')) {
        resp.resume();
        reject({ code: 'CONTENT_TYPE', contentType: ct });
        return;
      }

      const enc = (resp.headers['content-encoding'] || '').toLowerCase();
      const stream = enc === 'gzip' ? resp.pipe(zlib.createGunzip())
        : enc === 'deflate' ? resp.pipe(zlib.createInflate())
        : resp;

      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < MIN_AUDIO_BYTES) reject({ code: 'EMPTY', len: buf.length });
        else resolve(buf);
      });
      stream.on('error', (err) => reject({ code: 'DECODE', message: err.message }));
    });

    req.setTimeout(HTTP_TIMEOUT_MS, () => { req.destroy(); reject({ code: 'TIMEOUT' }); });
    req.on('error', (err) => reject({ code: 'NET', message: err.message }));

    if (signal) {
      const onAbort = () => { req.destroy(); reject({ code: 'ABORTED' }); };
      signal.addEventListener('abort', onAbort, { once: true });
      req.on('close', () => signal.removeEventListener('abort', onAbort));
    }
  });
}

const REINTENTABLE = new Set(['EMPTY', 'NET', 'TIMEOUT', 'DECODE', 'HTTP']);

/**
 * @param {{ text: string, voice?: string, slow?: boolean, logger?: object }} opts
 * @returns {Promise<{ buffer: Buffer, cached: boolean }>}
 * @throws {{ code, retryAfterMs?, ... }}  code: 'BACKOFF' | 'HTTP4XX' | 'EMPTY' | 'NET' | 'TIMEOUT' | ...
 */
async function fetchTtsAudio({ text, voice = 'es', slow = false, logger = null, signal = null }) {
  const lang = GOOGLE_TTS_LANGS.has(voice) ? voice : 'es';
  const clave = claveCache(text, lang, slow);

  // 1. Cache
  const enCache = leerCache(clave);
  if (enCache) return { buffer: enCache, cached: true };

  // 3. Backoff — ¿estamos en pausa?
  const ahora = Date.now();
  if (ahora < backoff.pausadoHasta) {
    const restante = backoff.pausadoHasta - ahora;
    if (logger) logger.log(
      'warn', 'sonido', 'sonido/tts/fetch-audio.js#fetchTtsAudio', 'sonido.tts.backoff_activo',
      `TTS en pausa por fallos seguidos de Google (${Math.ceil(restante / 1000)}s restantes)`,
      { restanteMs: restante, fallosSeguidos: backoff.fallosSeguidos }
    );
    throw { code: 'BACKOFF', retryAfterMs: restante };
  }

  // 2. Retry
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_ATTEMPTS; intento++) {
    try {
      const buffer = await pedirAGoogle(text, lang, slow, signal);
      // Exito → resetea backoff, guarda en cache
      backoff.fallosSeguidos = 0;
      backoff.pausadoHasta = 0;
      escribirCache(clave, buffer);
      return { buffer, cached: false };
    } catch (err) {
      ultimoError = err;
      if (!REINTENTABLE.has(err.code) || intento === MAX_ATTEMPTS) break;
      await esperar(RETRY_DELAY_MS * intento);
    }
  }

  // Cliente abortado (skip) — no es un fallo de Google, no cuenta para el backoff.
  if (ultimoError && ultimoError.code === 'ABORTED') throw ultimoError;

  // Agotados los intentos → cuenta como fallo para el backoff
  backoff.fallosSeguidos++;
  if (backoff.fallosSeguidos >= BACKOFF_AFTER_FAILS) {
    const idx = Math.min(backoff.fallosSeguidos - BACKOFF_AFTER_FAILS, BACKOFF_STEPS_MS.length - 1);
    backoff.pausadoHasta = Date.now() + BACKOFF_STEPS_MS[idx];
  }
  throw ultimoError || { code: 'DESCONOCIDO' };
}

// Para tests / diagnostico.
function _resetBackoff() {
  backoff.fallosSeguidos = 0;
  backoff.pausadoHasta = 0;
}

module.exports = { fetchTtsAudio, claveCache, CACHE_DIR, _resetBackoff, _backoff: backoff };
