'use strict';

// Overlays abiertos en OBS. Solo el primero de cada tipo por sesion: OBS
// recarga la fuente cada vez que cambia de escena. core/app.js (Fase 1,
// extendido en esta fase) emite overlay:opened al servir overlay-*.html.
function attach(bus, track) {
  const seen = new Set();

  bus.on('overlay:opened', (payload) => {
    const overlay = payload && payload.overlay;
    if (!overlay || seen.has(overlay)) return;
    seen.add(overlay);
    track('overlays', 'opened', { overlay });
  });
}

module.exports = { name: 'overlays', attach };
