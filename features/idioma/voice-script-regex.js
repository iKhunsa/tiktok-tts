'use strict';

// Migracion directa de backend-viejo/server.js:1248-1256.
const VOICE_SCRIPT_REGEX = {
  'es-MX': /\p{Script=Latin}/u, en: /\p{Script=Latin}/u, 'en-GB': /\p{Script=Latin}/u,
  pt: /\p{Script=Latin}/u, 'pt-PT': /\p{Script=Latin}/u, fr: /\p{Script=Latin}/u,
  de: /\p{Script=Latin}/u, it: /\p{Script=Latin}/u,
  ru: /\p{Script=Cyrillic}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  'zh-CN': /\p{Script=Han}/u,
  ko: /\p{Script=Hangul}/u,
};

module.exports = { VOICE_SCRIPT_REGEX };
