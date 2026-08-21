'use strict';

const https = require('https');
const gTTS = require('google-tts-api');
const { GOOGLE_TTS_LANGS } = require('../langs');
const { isTTSRateLimited } = require('../is-rate-limited');
const { sanitizeForTTS } = require('../../sanitize-for-tts');
const { getConfigSnapshot } = require('../../config-bridge');

/** Migracion de POST /api/tts (backend-viejo/server.js:1805). */
function generate(deps) {
  return (req, res) => {
    const { bus, logger, rateLimiterState } = deps;
    const { text, voice = 'es' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Texto requerido' });

    const config = getConfigSnapshot(bus);

    if (isTTSRateLimited(rateLimiterState, config)) {
      logger.log(
        'warn', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.rate_limitado',
        `TTS rate limitado para voz ${voice}`, { voice }
      );
      return res.status(429).json({ error: 'Rate limit activo', retryAfter: config.TTS_RATE_WINDOW_MS });
    }

    const limitedText = sanitizeForTTS(text.substring(0, config.TTS_MAX_CHARS));
    logger.log(
      'info', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.solicitado',
      `TTS solicitado, voz ${voice}`, { voice, textLen: limitedText.length }
    );

    try {
      const lang = GOOGLE_TTS_LANGS.has(voice) ? voice : 'es';
      const audioUrl = gTTS.getAudioUrl(limitedText, {
        lang,
        slow: !!config.ttsSlowSpeech,
        host: 'https://translate.google.com',
      });

      const reqTts = https.get(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (audioRes) => {
        const contentType = audioRes.headers['content-type'] || '';
        const contentLen = parseInt(audioRes.headers['content-length'] || '0', 10);

        if (audioRes.statusCode !== 200) {
          let errorBody = '';
          audioRes.on('data', (chunk) => { errorBody += chunk.toString().substring(0, 500); });
          audioRes.on('end', () => {
            logger.log(
              'error', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.error_google_http',
              `Google TTS respondio HTTP ${audioRes.statusCode}`, { status: audioRes.statusCode, contentType, errorBody }
            );
            res.status(500).json({ error: `Google TTS error: HTTP ${audioRes.statusCode}` });
          });
          return;
        }

        if (!contentType.includes('audio/mpeg') && !contentType.includes('audio')) {
          logger.log(
            'error', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.error_google_http',
            'Content-Type invalido en respuesta de Google TTS', { contentType, len: contentLen }
          );
          return res.status(500).json({ error: 'Invalid audio format from TTS service' });
        }

        if (contentLen < 1000) {
          logger.log(
            'warn', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.respuesta_pequena',
            'Respuesta de audio sospechosamente pequena', { len: contentLen, contentType }
          );
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        audioRes.pipe(res);

        logger.log(
          'debug', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.hablado',
          `TTS entregado, voz ${voice}`, { voice, slow: !!config.ttsSlowSpeech }
        );
      });

      reqTts.setTimeout(15000, () => {
        reqTts.destroy();
        logger.log(
          'error', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.error_google_timeout',
          'Timeout (15s) esperando a Google TTS', { voice, textLen: limitedText.length }
        );
        if (!res.headersSent) res.status(500).json({ error: 'TTS service timeout' });
      });

      reqTts.on('error', (err) => {
        logger.log(
          'error', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.error_google_red',
          `Error de red hacia Google TTS: ${err.message}`, { error: err.message, stack: err.stack, voice }
        );
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });
    } catch (err) {
      logger.log(
        'error', 'sonido', 'sonido/tts/routes/generate.js#generate', 'sonido.tts.error_google_red',
        `Fallo inesperado generando TTS: ${err.message}`, { error: err.message, stack: err.stack }
      );
      res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { generate };
