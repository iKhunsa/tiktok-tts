'use strict';

// Traduce el codigo de error de @tiklivetts/tiktok-live-client a un mensaje
// de usuario + errorKey (ver CLAUDE.md#i18n). Reemplaza el string-matching
// fragil que tenia routes/connect.js (`err.message.includes('LIVE')`, que
// nunca matcheaba de verdad — el mensaje real es "isn't online").
//
// NOT_LIVE = offline confirmado (aunque `err.confirmed` puede ser `false`,
// ver live-window.js — se sigue mostrando como offline por ahora, es el
// comportamiento historico). El supervisor (connect-tiktok-channel.js) ya
// programo el proximo intento en segundo plano — este mensaje es solo la
// respuesta HTTP del clic de "Conectar", nunca implica que se dio de baja la
// intencion del usuario. LIVE_STATUS_UNKNOWN (y cualquier otro codigo) = la
// comprobacion fallo, no sabemos si esta en vivo — nunca se afirma que el
// directo termino ni que hubo un error de la aplicacion.
function tiktokConnectErrorMessage(err) {
  if (err.code === 'NOT_LIVE') {
    return { error: 'Este canal no está en vivo. Esperaremos su próximo live.', errorKey: 'errors.tiktokEsperandoProximoLive' };
  }
  return { error: 'No pudimos comprobar si el usuario está en vivo. Intentá nuevamente', errorKey: 'errors.tiktokEstadoDesconocido' };
}

module.exports = { tiktokConnectErrorMessage };
