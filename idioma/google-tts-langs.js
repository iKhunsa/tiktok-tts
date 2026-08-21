'use strict';

// Migracion directa de backend-viejo/server.js:584.
const GOOGLE_TTS_LANGS = new Set(['es-MX', 'en', 'en-GB', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ja', 'zh-CN', 'ru', 'ko']);

module.exports = { GOOGLE_TTS_LANGS };
