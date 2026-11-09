'use strict';

// Deja rastro (log local + GlitchTip) del baile OAuth de Google/Twitch/Kick,
// que vive en electron-shell/*-auth.js + oauth-loopback.js y no loguea nada.
//
// Envuelve la funcion que dispara el baile y NO cambia su resultado ni su
// error: el renderer recibe exactamente lo mismo que antes. Nunca se loguea el
// `code`, el `codeVerifier` ni el redirectUri (son credenciales de un solo
// uso): solo la plataforma y el motivo del fallo.
//
// Que es esperado y que no:
//  - access_denied: el usuario toco "Cancelar" en el consentimiento -> info.
//  - timeout: cerro/abandono el navegador (5 min) -> warn, queda en Logs pero
//    NO se promueve a issue (no es un bug).
//  - cualquier otra cosa (puerto ocupado, "no se recibio code", falta el
//    client_id) -> error: va a GlitchTip como `error_oauth`.

const ARCHIVO = 'electron-shell/log-oauth.js#conLogOAuth';

async function conLogOAuth(logger, plataforma, baile) {
  logger.log('info', 'electron-shell', ARCHIVO, 'electron_shell.oauth.iniciado',
    `Login ${plataforma}: abriendo el navegador`, { plataforma });
  try {
    const resultado = await baile();
    logger.log('info', 'electron-shell', ARCHIVO, 'electron_shell.oauth.completado',
      `Login ${plataforma}: autorizado en el navegador`, { plataforma });
    return resultado;
  } catch (err) {
    const motivo = err && err.message ? err.message : String(err);
    if (motivo === 'access_denied') {
      logger.log('info', 'electron-shell', ARCHIVO, 'electron_shell.oauth.cancelado',
        `Login ${plataforma}: el usuario cancelo`, { plataforma });
    } else if (motivo === 'timeout') {
      logger.log('warn', 'electron-shell', ARCHIVO, 'electron_shell.oauth.timeout',
        `Login ${plataforma}: sin respuesta del navegador (timeout)`, { plataforma });
    } else {
      logger.log('error', 'electron-shell', ARCHIVO, 'electron_shell.oauth.fallido',
        `Login ${plataforma} fallo: ${motivo}`, { plataforma, error: err instanceof Error ? err : new Error(motivo) });
    }
    throw err;
  }
}

module.exports = { conLogOAuth };
