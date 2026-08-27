'use strict';

const path = require('path');
const { ensureReady } = require('./ensure-ready');
const { getStatus } = require('./get-status');
const { checkForUpdates } = require('./check-for-updates');
const { search } = require('./search');
const { getInfo } = require('./get-info');
const { expandPlaylist } = require('./expand-playlist');
const { createStream } = require('./create-stream');
const { shutdown } = require('./shutdown');

/**
 * Motor de musica basado en el binario yt-dlp. Migracion 1:1 de
 * backend-viejo/music-engine.js (factory createMusicEngine), un archivo
 * por metodo en vez de closures internos.
 */
function createMusicEngine({ dataDir, logger, onStatus }) {
  const binDir = path.join(dataDir, 'bin');
  const state = {
    dataDir,
    logger,
    onStatus,
    binDir,
    ytdlpPath: path.join(binDir, 'yt-dlp.exe'),
    updateMarker: path.join(binDir, '.last-update-check'),
    status: { state: 'missing', version: null, error: null },
    readyPromise: null,
    jsRuntimeArgs: null, // null = sin probar; [] = no soportado; [flag, valor] = activo
    liveChildren: new Set(),
  };

  return {
    ensureReady: () => ensureReady(state),
    getStatus: () => getStatus(state),
    checkForUpdates: () => checkForUpdates(state),
    search: (query) => search(state, query),
    getInfo: (videoId) => getInfo(state, videoId),
    expandPlaylist: (url) => expandPlaylist(state, url),
    createStream: (videoId) => createStream(state, videoId),
    shutdown: () => shutdown(state),
  };
}

module.exports = { createMusicEngine };
