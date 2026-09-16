'use strict';

const { session } = require('electron');
const { PARTITION_NAME } = require('./constants');

// Deniega por defecto todo lo que un sitio de terceros podria pedir sin que
// el usuario lo haya buscado explicitamente — PortalView carga TikTok/Twitch/
// Kick/lo que el usuario escriba, nunca codigo propio. fullscreen se permite
// (ej. ver un stream/video a pantalla completa dentro del panel).
const PERMISOS_PERMITIDOS = new Set(['fullscreen']);

// ponytail: whitelist plana por nombre de permiso, sin distincion por origen.
// Si mas adelante hace falta permitir camara/microfono para un sitio puntual
// (ej. el propio login-por-cuenta necesitando compartir pantalla), el upgrade
// es agregar un chequeo de `requestingOrigin` aca, no reescribir esto.
function attachPermissionHandling(sess) {
  sess.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(PERMISOS_PERMITIDOS.has(permission));
  });
  sess.setPermissionCheckHandler((_webContents, permission) => PERMISOS_PERMITIDOS.has(permission));
}

// Particion persistente unica ('persist:' = sobrevive a reinicios de la app).
// Unico lugar donde se resuelve el nombre — el dia que exista login-por-cuenta,
// cambia aca (ej. particion por cuenta) y en ningun otro lado.
let _session = null;

function getPortalViewSession() {
  if (!_session) {
    _session = session.fromPartition(PARTITION_NAME);
    attachPermissionHandling(_session);
  }
  return _session;
}

module.exports = { getPortalViewSession };
