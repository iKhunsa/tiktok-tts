'use strict';

// Ciclo de electron-updater. Permite ver la curva de adopcion de cada release
// y detectar actualizaciones que fallan sistematicamente.

function attach(bus, track) {
  bus.on('update:check', () => track('updates', 'check', {}));

  bus.on('update:available', ({ from, to } = {}) => {
    track('updates', 'available', { from_version: from || null, to_version: to || null });
  });

  bus.on('update:downloaded', ({ from, to } = {}) => {
    track('updates', 'downloaded', { from_version: from || null, to_version: to || null });
  });

  bus.on('update:error', ({ message } = {}) => {
    track('updates', 'error', { message: String(message || '').slice(0, 200) });
  });
}

module.exports = { name: 'updates', attach };
