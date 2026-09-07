'use strict';

const { isTTSRateLimited } = require('../is-rate-limited');
const { sanitizeForTTS } = require('../../sanitize-for-tts');
const { getConfigSnapshot } = require('../../config-bridge');
const { fetchTtsAudio } = require('../fetch-audio');

// Mensajes de error de Google que no valen la pena reintentar (4xx) vs los
// transitorios (rate-limit, red). fetch-audio.js ya distingue; aca solo se
// traduce el code a la respuesta HTTP + el evento de log.
const EVENTO_POR_CODE = {
  BACKOFF:      'sonido.tts.backoff_activo',
  EMPTY:        'sonido.tts.respuesta_pequena',
  TIMEOUT:      'sonido.tts.error_google_timeout',
  NET:          'sonido.tts.error_google_red',
  DECODE:       'sonido.tts.error_google_red',
  HTTP:         'sonido.tts.error_google_http',
  HTTP4XX:      'sonido.tts.error_google_http',
  CONTENT_TYPE: 'sonido.tts.error_google_http',
  URL:          'sonido.tts.error_google_red',
};

/** Migracion de POST /api/tts (backend-viejo/server.js:1805). */
function generate(deps) {
  return async (req, res) => {
    const { bus, logger, rateLimiterState } = deps;
    const { text, voice = 'es' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Texto requerido', errorKey: 'errors.textRequired' });

    const config = getConfigSnapshot(bus);

    if (isTTSRateLimited(rateLimiterState, config)) {
      logger.log(
        'warn', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.rate_limitado',
        `TTS rate limitado para voz ${voice}`, { voice }
      );
      return res.status(429).json({ error: 'Rate limit activo', errorKey: 'errors.ttsRateLimited', retryAfter: config.TTS_RATE_WINDOW_MS });
    }

    const limitedText = sanitizeForTTS(text.substring(0, config.TTS_MAX_CHARS));
    logger.log(
      'info', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.solicitado',
      `TTS solicitado, voz ${voice}`, { voice, textLen: limitedText.length }
    );

    // El cliente aborta esta request al "saltar" un mensaje TTS. Propagamos el
    // corte a la peticion a Google en vuelo (fetch-audio.js) para no dejarla
    // viva 15s ni dispararle el rate-limit con el spam de skips.
    // OJO: `res.on('close')` (no `req.on('close')` — ese salta apenas se termina
    // de leer el body del POST y abortaria SIEMPRE). `writableFinished` false
    // aca = la conexion se corto antes de mandar la respuesta = cliente se fue.
    const ac = new AbortController();
    res.on('close', () => { if (!res.writableFinished) ac.abort(); });

    try {
      const { buffer, cached } = await fetchTtsAudio({
        text: limitedText,
        voice,
        slow: !!config.ttsSlowSpeech,
        logger,
        signal: ac.signal,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', cached ? 'public, max-age=86400' : 'no-cache');
      res.send(buffer);

      logger.log(
        'debug', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.hablado',
        `TTS entregado, voz ${voice}${cached ? ' (cache)' : ''}`,
        { voice, slow: !!config.ttsSlowSpeech, cache: cached, bytes: buffer.length }
      );
    } catch (err) {
      const code = (err && err.code) || 'DESCONOCIDO';
      // Cliente corto la conexion (skip) — no es un error, la respuesta ya no existe.
      if (code === 'ABORTED' || (!res.writableEnded && !!res.socket && res.socket.destroyed)) return;
      const evento = EVENTO_POR_CODE[code] || 'sonido.tts.error_google_red';
      // BACKOFF ya se loguea dentro de fetch-audio.js — aca solo la respuesta.
      if (code !== 'BACKOFF') {
        const nivel = code === 'EMPTY' ? 'warn' : 'error';
        logger.log(
          nivel, 'sonido', 'sonido/tts/routes/generate.js#generate', evento,
          `Fallo generando TTS (${code})`,
          { voice, code, status: err && err.status, len: err && err.len, textLen: limitedText.length }
        );
      }

      if (!res.headersSent) {
        const status = code === 'BACKOFF' ? 503 : 502;
        res.status(status).json({
          error: `TTS no disponible (${code})`,
          errorKey: 'errors.ttsServiceError',
          ...(err && err.retryAfterMs ? { retryAfter: err.retryAfterMs } : {}),
        });
      }
    }
  };
}

module.exports = { generate };
