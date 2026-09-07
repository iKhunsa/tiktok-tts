'use strict';

// OBS conectado via canal:estado (platform:'obs'); clip guardado via el
// espejo de logs (clips.marcado.exitoso, Fase 11) — /clips no emite un
// evento de bus dedicado para esto, solo lo loguea.
function attach(bus, track) {
  bus.on('canal:estado', (payload) => {
    if (payload && payload.platform === 'obs' && payload.state === 'conectado') {
      track('obs', 'connected', {});
    }
  });
  bus.on('log:entry', (entry) => {
    if (entry && entry.event === 'clips.marcado.exitoso') track('obs', 'clip_saved', {});
  });
}

module.exports = { name: 'obs', attach };
