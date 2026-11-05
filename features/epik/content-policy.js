'use strict';

const HOST_VALIDO = /^[\w.-]+(:\d+)?$|^\[[0-9a-f:]+\](:\d+)?$/i;

/**
 * CSP de los archivos de un .epik. `sandbox allow-scripts` le da origen opaco aunque
 * alguien abra la URL suelta (sin el iframe de la app): asi nunca puede usar la API local.
 * Sin red (connect-src 'none'); imagenes y video de la app (portadas, avatares, /api/music/video)
 * y Google Fonts si estan permitidos.
 */
function politicaEpik(host) {
  // 'self' no sirve con origen opaco: se nombra el servidor de la app explicitamente.
  const app = HOST_VALIDO.test(host || '') ? `http://${host}` : '';
  return [
    'sandbox allow-scripts',
    "default-src 'none'",
    `script-src 'self' ${app} 'unsafe-inline'`,
    `style-src 'self' ${app} 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' ${app} data: https://fonts.gstatic.com`,
    `img-src 'self' ${app} data: blob: https:`,
    `media-src 'self' ${app} data: blob:`,
    "connect-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
}

module.exports = { politicaEpik };
