'use strict';

const { DICT_FILTER_LANGS } = require('./dict-filter-langs');
const { VOICE_TO_DICT_LANG } = require('./voice-to-dict-lang');
const { loadLangDicts } = require('./lang-dicts');

/**
 * Decide si el mensaje "suena" al idioma de la voz (o a uno extra permitido).
 * Por token: en dict permitido -> positivo; solo en dicts no permitidos ->
 * negativo; en ninguno (typos, nombres, slang) -> neutral. Se bloquea solo
 * con evidencia negativa y cero positiva — sesgo fail-open a proposito.
 * Migracion directa de backend-viejo/server.js:1295-1315, pero pura: recibe
 * voiceId y allowedExtraLangs como parametros en vez de leer config global.
 */
function messageMatchesDictLang(logger, text, voiceId, allowedExtraLangs = []) {
  const voiceLang = VOICE_TO_DICT_LANG[voiceId];
  if (!voiceLang) return { ok: true, positive: 0, negative: 0 };

  const dicts = loadLangDicts(logger);
  const allowed = new Set([voiceLang, ...allowedExtraLangs]);
  let positive = 0;
  let negative = 0;
  const tokens = text.normalize('NFC').split(/[^\p{L}]+/u).filter((t) => t.length >= 2);

  for (const token of tokens) {
    let inAllowed = false;
    let inOther = false;
    for (const lang of DICT_FILTER_LANGS) {
      if (!dicts.get(lang).has(token)) continue;
      if (allowed.has(lang)) { inAllowed = true; break; }
      inOther = true;
    }
    if (inAllowed) positive++;
    else if (inOther) negative++;
  }

  const ok = !(negative > 0 && positive === 0);
  logger.log(
    'debug', 'idioma', 'idioma/message-matches-dict-lang.js#messageMatchesDictLang',
    'idioma.dict.evaluado', `Evaluacion de diccionario para ${voiceId}`, { voiceId, coincide: ok }
  );
  return { ok, positive, negative };
}

module.exports = { messageMatchesDictLang };
