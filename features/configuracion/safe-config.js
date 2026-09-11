'use strict';

/** Config sin adminIdentities — para cualquier respuesta/broadcast accesible desde el front o la LAN sin auth (regla dura #5, ver get-status.js). */
function getSafeConfig(config) {
  const { adminIdentities, ...safeConfig } = config;
  return safeConfig;
}

module.exports = { getSafeConfig };
