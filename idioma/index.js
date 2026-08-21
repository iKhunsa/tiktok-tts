'use strict';

const { messageMatchesVoiceScriptLogged } = require('./message-matches-voice-script');
const { messageMatchesDictLang } = require('./message-matches-dict-lang');
const idiomaFiltrarContract = require('../core/contracts/idioma-filtrar');

/**
 * Combina messageMatchesVoiceScript + messageMatchesDictLang segun la
 * config activa. Dominio puro: recibe langFilterEnabled/dictFilterEnabled/
 * allowedExtraLangs como parametros, nunca importa /configuracion directo.
 * @returns {{ok: boolean, stage?: 'script'|'dict', positive?: number, negative?: number}}
 */
function filtrar(logger, text, voiceId, { langFilterEnabled = false, dictFilterEnabled = false, allowedExtraLangs = [] } = {}) {
  if (langFilterEnabled && !messageMatchesVoiceScriptLogged(logger, text, voiceId)) {
    return { ok: false, stage: 'script' };
  }
  if (dictFilterEnabled) {
    const dict = messageMatchesDictLang(logger, text, voiceId, allowedExtraLangs);
    if (!dict.ok) return { ok: false, stage: 'dict', positive: dict.positive, negative: dict.negative };
  }
  return { ok: true };
}

module.exports = {
  name: 'idioma',

  register({ logger }) {
    // Inyeccion en tiempo de registro: /moderacion y /sonido consumen la
    // interfaz de core/contracts/idioma-filtrar.js (definida vacia en la
    // Fase 1) sin importar idioma/ directo — mismo patron que moderacion-policy.
    idiomaFiltrarContract.filtrar = (text, voiceId, opts) => filtrar(logger, text, voiceId, opts);

    return { rutas: 0, listeners: 0 };
  },
};
