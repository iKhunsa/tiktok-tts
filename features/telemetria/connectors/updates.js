'use strict';

// Ciclo de electron-updater — electron-shell/updater.js (esta misma fase)
// emite estos eventos con los mismos nombres que el backend viejo.
function attach(bus, track) {
  bus.on('update:check', () => track('updates', 'check', {}));

  bus.on('update:available', (payload) => {
    const { from, to } = payload || {};
    track('updates', 'available', { from_version: from || null, to_version: to || null });
  });

  bus.on('update:downloaded', (payload) => {
    const { from, to } = payload || {};
    track('updates', 'downloaded', { from_version: from || null, to_version: to || null });
  });

  bus.on('update:error', (payload) => {
    const { message } = payload || {};
    track('updates', 'error', { message: String(message || '').slice(0, 200) });
  });
}

module.exports = { name: 'updates', attach };
