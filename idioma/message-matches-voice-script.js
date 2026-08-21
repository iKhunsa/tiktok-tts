'use strict';

const { VOICE_SCRIPT_REGEX } = require('./voice-script-regex');

// Migracion directa de backend-viejo/server.js:1258-1263.
function messageMatchesVoiceScript(text, voiceId) {
  const letters = text.match(/\p{L}/gu);
  if (!letters) return true;
  const allowed = VOICE_SCRIPT_REGEX[voiceId] || VOICE_SCRIPT_REGEX['es-MX'];
  return letters.every((ch) => allowed.test(ch));
}

/** Wrapper con logging: idioma.script.evaluado (debug), nunca el texto. */
function messageMatchesVoiceScriptLogged(logger, text, voiceId) {
  const coincide = messageMatchesVoiceScript(text, voiceId);
  logger.log(
    'debug', 'idioma', 'idioma/message-matches-voice-script.js#messageMatchesVoiceScript',
    'idioma.script.evaluado', `Evaluacion de script de voz para ${voiceId}`, { voiceId, coincide }
  );
  return coincide;
}

module.exports = { messageMatchesVoiceScript, messageMatchesVoiceScriptLogged };
