'use strict';

/**
 * Regla unica del admin (adminIdentities): nada de la moderacion lo
 * restringe. @tiklivetts/chat-guard solo lo exime de las reglas de
 * identidad y gibberish; las de contenido (caracteres repetidos, palabras
 * bloqueadas, flood, largo) lo frenaban igual. Esto pisa el veredicto a
 * 'allow'. Unica excepcion: 'duplicate-redelivery' no es un castigo, es la
 * misma entrega repetida por la plataforma -- se sigue descartando.
 */
function allowAdmin(verdict, maxSpeechLength) {
  if (verdict.reasons.includes('duplicate-redelivery')) return verdict;
  const { message } = verdict;
  return {
    ...verdict,
    action: 'allow',
    reasons: [],
    advisories: [],
    // chat-guard no recorta el texto hablado de un 'drop'; el de Google TTS tiene tope.
    message: { ...message, text: { ...message.text, speech: message.text.speech.slice(0, maxSpeechLength) } },
  };
}

module.exports = { allowAdmin };
