'use strict';

// Lock de "conexion en progreso" por canal/slug — evita que 2 intentos casi
// simultaneos (doble click, o el watchdog de auto-reconexion disparando justo
// cuando el usuario reconecta a mano) creen dos conexiones en paralelo para el
// mismo canal. Un Set por plataforma (state.connectingTiktok/connectingTwitch/
// connectingYoutube/connectingKick, ver features/canales/state/channel-maps.js).
// Lanza (409) si ya hay una conexion en curso; el caller libera con
// `connectingSet.delete(key)` en su propio try/finally.
function assertNoConexionEnCurso(connectingSet, key) {
  if (connectingSet.has(key)) {
    const err = new Error('Conexión ya en progreso para este canal');
    err.statusCode = 409;
    throw err;
  }
  connectingSet.add(key);
}

module.exports = { assertNoConexionEnCurso };
