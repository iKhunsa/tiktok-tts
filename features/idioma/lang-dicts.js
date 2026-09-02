'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../core/paths');
const { DICT_FILTER_LANGS } = require('./dict-filter-langs');

// Carga lazy: solo se leen del disco la primera vez que se necesitan (es
// decir, nunca si dictFilterEnabled queda apagado en toda la sesion).
let langDicts = null;

function loadLangDicts(logger) {
  if (langDicts) return langDicts;
  langDicts = new Map();
  for (const lang of DICT_FILTER_LANGS) {
    const set = new Set();
    const file = path.join(RESOURCE_BASE, 'lang-words', `${lang}.json`);
    try {
      for (const word of JSON.parse(fs.readFileSync(file, 'utf-8'))) {
        set.add(word);
        // Variante sin acentos: un typo como "cancion" tambien cuenta como evidencia.
        const folded = word.normalize('NFD').replace(/\p{M}/gu, '');
        if (folded !== word) set.add(folded);
      }
      logger.log(
        'info', 'idioma', 'idioma/lang-dicts.js#loadLangDicts', 'idioma.dict.cargado',
        `Diccionario de ${lang} cargado con ${set.size} palabra(s)`, { lang, palabras: set.size }
      );
    } catch (error) {
      // Fail-open: sin diccionario, ese idioma nunca genera evidencia — no
      // tumba el proceso ni bloquea los demas idiomas ya cargados.
      logger.log(
        'warn', 'idioma', 'idioma/lang-dicts.js#loadLangDicts', 'idioma.dict.carga_fallida',
        `No se pudo cargar el diccionario de ${lang}: ${error.message}`, { lang, path: file, error: error.message }
      );
    }
    langDicts.set(lang, set);
  }
  return langDicts;
}

/** Solo para tests: fuerza una recarga en la proxima llamada. */
function resetLangDictsCache() {
  langDicts = null;
}

module.exports = { loadLangDicts, resetLangDictsCache };
