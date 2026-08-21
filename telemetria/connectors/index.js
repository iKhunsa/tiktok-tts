'use strict';

// Conectores del lado servidor. Cada uno escucha eventos del bus (Fase 1) y
// los traduce a eventos de telemetria via track().
module.exports = [
  require('./creators'),
  require('./platforms'),
  require('./counters'),
  require('./obs'),
  require('./mobile'),
  require('./overlays'),
  require('./updates'),
  require('./errors'),
  require('./settings'),
];
