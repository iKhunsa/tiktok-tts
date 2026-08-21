'use strict';

// Panel movil. Se registra QUE comando se usa, no su contenido.

function attach(bus, track) {
  bus.on('mobile:paired', () => track('mobile', 'paired', {}));
  bus.on('mobile:command', ({ command } = {}) => {
    track('mobile', 'command', { command: command || 'unknown' });
  });
}

module.exports = { name: 'mobile', attach };
