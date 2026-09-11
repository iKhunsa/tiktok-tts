'use strict';

// Panel movil. Se registra QUE comando se usa, no su contenido. /movil
// (Fase 8) emite movil:emparejado y movil:comando (vocabulario nuevo).
function attach(bus, track) {
  bus.on('movil:emparejado', () => track('mobile', 'paired', {}));
  bus.on('movil:comando', (cmd) => {
    track('mobile', 'command', { command: (cmd && cmd.action) || 'unknown' });
  });
}

module.exports = { name: 'mobile', attach };
