'use strict';

// Idiomas con diccionario de frecuencia (public/lang-words/*.json) para el
// filtro por palabras. Solo alfabeto latino: ru/ja/zh-CN/ko no mapean porque
// el filtro de script (voice-script-regex.js) ya los distingue.
// Migracion directa de backend-viejo/server.js:589.
const DICT_FILTER_LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];

module.exports = { DICT_FILTER_LANGS };
