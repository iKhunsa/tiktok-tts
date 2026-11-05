'use strict';

const { getConfigSnapshot } = require('../config-bridge');

/**
 * Las proximas canciones en orden: primero la cola del chat y despues la
 * playlist de fondo (desde la que toca). En aleatorio solo se conoce la
 * siguiente, que advance-queue ya dejo sorteada. Las entradas de playlist
 * sin resolver (sin videoId) se saltan: no hay nada que mostrar ni descargar.
 */
function upcomingTracks({ musicState, bus }, max) {
  const proximas = musicState.queue.slice(0, max);
  const config = getConfigSnapshot(bus);
  const lista = musicState.playlistResolved;
  if (!config.playlistEnabled || !lista.length) return proximas;
  const cuantas = config.playlistShuffle ? 1 : lista.length;
  for (let i = 0; i < cuantas && proximas.length < max; i += 1) {
    const entrada = lista[(musicState.playlistIndex + i) % lista.length];
    if (entrada?.videoId && entrada.videoId !== musicState.currentTrack?.videoId) proximas.push({ ...entrada, requestedBy: null, platform: 'playlist' });
  }
  return proximas;
}

module.exports = { upcomingTracks };
