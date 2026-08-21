'use strict';

function attach(bus, track) {
  bus.on('obs:connected', () => track('obs', 'connected', {}));
  bus.on('obs:clip-saved', () => track('obs', 'clip_saved', {}));
}

module.exports = { name: 'obs', attach };
