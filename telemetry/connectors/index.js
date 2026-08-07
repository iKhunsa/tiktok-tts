'use strict';

// Conectores del lado cliente. Cada uno escucha eventos del bus interno y los
// traduce a eventos de telemetria.

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
