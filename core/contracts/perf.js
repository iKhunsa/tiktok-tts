'use strict';

// Contrato de performance tracing. Por defecto es un passthrough (no-op):
// simplemente ejecuta la función. electron-shell/glitchtip.js inyecta la
// implementación real (Sentry.startSpan) cuando el tracing está activo, así
// los dominios no tienen que conocer Sentry.
//
//   const perf = require('../core/contracts/perf');
//   const info = await perf.span('musica.getinfo', { videoId }, () => engine.getInfo(id));

const perf = {
  span(name, attributes, fn) {
    return fn();
  },
};

module.exports = perf;
