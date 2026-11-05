'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createPrefetcher } = require('../features/sonido/musica/prefetch');
const { createMusicState } = require('../features/sonido/musica/state');

function fakeEngine({ falla = [] } = {}) {
  const cache = new Set();
  const descargas = [];
  let enCurso = 0;
  let maxEnCurso = 0;
  return {
    descargas,
    maxEnCurso: () => maxEnCurso,
    cachedAudio: (id) => (cache.has(id) ? { ruta: id, tipo: 'audio/webm' } : null),
    async downloadAudio(id) {
      descargas.push(id);
      maxEnCurso = Math.max(maxEnCurso, ++enCurso);
      await new Promise((r) => setTimeout(r, 0));
      enCurso -= 1;
      if (falla.includes(id)) throw new Error('yt-dlp exit 1');
      cache.add(id);
    },
  };
}

const logger = { log() {} };
// config:get sincrono, como el contrato real del bus.
const busCon = (config = {}) => ({ emit(evento, cb) { if (evento === 'config:get') cb({ playlistEnabled: false, playlistShuffle: false, ...config }); } });
const track = (videoId) => ({ videoId, title: videoId });
const esperar = () => new Promise((r) => setTimeout(r, 100));

test('precarga la actual y las siguientes de la cola, de una en una', async () => {
  const musicState = createMusicState();
  musicState.currentTrack = track('a');
  musicState.queue.push(track('b'), track('c'), track('d'), track('e'));
  const engine = fakeEngine();
  const precargar = createPrefetcher({ musicState, engine, logger, bus: busCon() });

  precargar();
  precargar(); // un segundo aviso mientras descarga no abre otra descarga
  await esperar();

  assert.deepEqual(engine.descargas, ['a', 'b', 'c', 'd']);
  assert.equal(engine.maxEnCurso(), 1);
});

test('una cancion que falla no se reintenta en bucle', async () => {
  const musicState = createMusicState();
  musicState.queue.push(track('x'), track('y'));
  const engine = fakeEngine({ falla: ['x'] });
  const precargar = createPrefetcher({ musicState, engine, logger, bus: busCon() });

  precargar();
  await esperar();
  precargar();
  await esperar();

  assert.deepEqual(engine.descargas, ['x', 'y']);
});

test('sin peticiones del chat precarga las siguientes de la playlist, en orden', async () => {
  const musicState = createMusicState();
  musicState.currentTrack = track('p1');
  musicState.playlistResolved = [track('p0'), track('p1'), track('p2'), { raw: 'sin resolver' }, track('p4'), track('p5')];
  musicState.playlistIndex = 2; // la que toca despues de p1
  const engine = fakeEngine();
  const precargar = createPrefetcher({ musicState, engine, logger, bus: busCon({ playlistEnabled: true }) });

  precargar();
  await esperar();

  assert.deepEqual(engine.descargas, ['p1', 'p2', 'p4', 'p5']);
});

test('las mezclas de mas de 15 minutos no se precargan', async () => {
  const musicState = createMusicState();
  musicState.queue.push({ videoId: 'mix', duration: '80:01' }, { videoId: 'tema', duration: '3:20' });
  const engine = fakeEngine();
  const precargar = createPrefetcher({ musicState, engine, logger, bus: busCon() });

  precargar();
  await esperar();

  assert.deepEqual(engine.descargas, ['tema']);
});

test('con un overlay mostrando video, baja tambien los videos despues de cada audio', async () => {
  const musicState = createMusicState();
  musicState.currentTrack = track('a');
  musicState.queue.push(track('b'));
  musicState.videoWantedAt = Date.now();
  const engine = fakeEngine();
  const videos = [];
  engine.cachedVideo = (id) => (videos.includes(id) ? { ruta: id } : null);
  engine.downloadVideo = async (id) => { engine.descargas.push(`video:${id}`); videos.push(id); };
  const precargar = createPrefetcher({ musicState, engine, logger, bus: busCon() });

  precargar();
  await esperar();

  assert.deepEqual(engine.descargas, ['a', 'video:a', 'b', 'video:b']);
});
