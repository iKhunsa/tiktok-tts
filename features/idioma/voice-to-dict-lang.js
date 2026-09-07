'use strict';

// Migracion directa de backend-viejo/server.js:590-593.
const VOICE_TO_DICT_LANG = {
  'es-MX': 'es', en: 'en', 'en-GB': 'en', pt: 'pt', 'pt-PT': 'pt',
  fr: 'fr', de: 'de', it: 'it',
};

module.exports = { VOICE_TO_DICT_LANG };
