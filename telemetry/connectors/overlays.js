'use strict';

// Overlays abiertos en OBS. Solo el primero de cada tipo por sesion: OBS
// recarga la fuente cada vez que cambia de escena y eso inflaria el conteo.

function attach(bus, track) {
  const seen = new Set();

  bus.on('overlay:opened', ({ overlay, customBg } = {}) => {
    if (!overlay || seen.has(overlay)) return;
    seen.add(overlay);
    track('overlays', 'opened', { overlay, custom_bg: !!customBg });
  });
}

module.exports = { name: 'overlays', attach };
