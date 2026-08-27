'use strict';

const path = require('path');
const express = require('express');
const fs = require('fs');
const { DATA_BASE } = require('../core/paths');
const { createTtsRateLimiterState } = require('./tts/is-rate-limited');
const { generate } = require('./tts/routes/generate');
const { voices } = require('./tts/routes/voices');

const { createMusicEngine } = require('./musica/engine/create');
const { createMusicState } = require('./musica/state');
const { handleMusicRequest } = require('./musica/handle-request');
const { resolveAndSavePlaylist } = require('./musica/resolve-and-save-playlist');
const { getConfigSnapshot } = require('./config-bridge');

const { stream } = require('./musica/routes/stream');
const { engineStatus } = require('./musica/routes/engine-status');
const { queue } = require('./musica/routes/queue');
const { skip } = require('./musica/routes/skip');
const { next } = require('./musica/routes/next');
const { configGet } = require('./musica/routes/config-get');
const { configPatch } = require('./musica/routes/config-patch');
const { ban } = require('./musica/routes/ban');
const { unban } = require('./musica/routes/unban');
const { playlistGet } = require('./musica/routes/playlist-get');
const { playlistPut } = require('./musica/routes/playlist-put');
const { playlistToggle } = require('./musica/routes/playlist-toggle');
const { playlistPlay } = require('./musica/routes/playlist-play');
const { playlistShuffle } = require('./musica/routes/playlist-shuffle');

const { list } = require('./soundpad/routes/list');
const { upload } = require('./soundpad/routes/upload');
const { patch } = require('./soundpad/routes/patch');
const { del } = require('./soundpad/routes/delete');
const { attachSoundpadShortcuts } = require('./soundpad/shortcuts');

let engineInstance = null;

module.exports = {
  name: 'sonido',

  register({ app, bus, logger }) {
    const soundsDir = path.join(DATA_BASE, 'sounds');
    fs.mkdirSync(soundsDir, { recursive: true });
    const soundsConfigPath = path.join(DATA_BASE, 'sounds-config.json');
    app.use('/sounds', express.static(soundsDir));

    const musicState = createMusicState();
    const engine = createMusicEngine({
      dataDir: DATA_BASE,
      logger,
      onStatus: (s) => {
        if (s.state === 'downloading') bus.emit('ws:broadcast', { type: 'music-engine', status: 'downloading' });
        else if (s.state === 'preparing') bus.emit('ws:broadcast', { type: 'music-engine', status: 'preparing' });
        else if (s.state === 'ready') bus.emit('ws:broadcast', { type: 'music-engine', status: 'ready' });
        else if (s.state === 'error') bus.emit('ws:broadcast', { type: 'music-engine', status: 'error', error: s.error });
      },
    });
    engineInstance = engine;

    const deps = { app, bus, logger, musicState, engine, soundsDir, soundsConfigPath };
    const ttsRateLimiterState = createTtsRateLimiterState();

    // ── TTS ──────────────────────────────────────────────────────────────
    app.post('/api/tts', generate({ bus, logger, rateLimiterState: ttsRateLimiterState }));
    app.get('/api/voices', voices());

    // ── Bot musical: consume bot:comando de /bot (Fase 10) — la deteccion
    // de !p ya no vive aca, solo la ejecucion.
    const runMusicRequest = handleMusicRequest(deps);
    bus.on('bot:comando', (cmd) => {
      if (!cmd || cmd.cmd !== 'play') return;
      runMusicRequest({ query: cmd.args, user: cmd.user, userId: cmd.userId, platform: cmd.platform });
    }, 'sonido');

    // ── chat:mensaje-permitido: expone el gancho de habla (el front decide
    // via el campo ttsBlocked que ya viaja en el WS de /chat — este evento
    // es un gancho adicional para consumidores futuros, ej. telemetria) ──
    bus.on('chat:mensaje-permitido', (payload) => {
      if (!payload || payload.ttsBlocked) return;
      const text = payload.ttsComment || payload.comment;
      if (!text) return;
      bus.emit('sonido:hablar', { text, platform: payload.platform, user: payload.user });
    }, 'sonido');

    app.get('/api/music/stream', stream(deps));
    app.get('/api/music/engine', engineStatus(engine));
    app.get('/api/music/queue', queue(musicState));
    app.post('/api/music/skip', skip(deps));
    app.post('/api/music/next', next(deps));
    app.get('/api/music/config', configGet(bus));
    app.patch('/api/music/config', configPatch(deps));
    app.post('/api/music/ban', ban(bus));
    app.post('/api/music/unban', unban(bus));
    app.get('/api/music/playlist', playlistGet(deps));
    app.put('/api/music/playlist', playlistPut(deps));
    app.post('/api/music/playlist/toggle', playlistToggle(deps));
    app.post('/api/music/playlist/play', playlistPlay(deps));
    app.post('/api/music/playlist/shuffle', playlistShuffle(deps));

    // ── Soundpad ─────────────────────────────────────────────────────────
    app.get('/api/soundpad/list', list(soundsConfigPath));
    app.post('/api/soundpad/upload', upload(deps));
    app.patch('/api/soundpad/:id', patch(deps));
    app.delete('/api/soundpad/:id', del(deps));
    attachSoundpadShortcuts(deps);

    // Inicializar playlist desde config persistida.
    const config = getConfigSnapshot(bus);
    if (Array.isArray(config.streamerPlaylist) && config.streamerPlaylist.length > 0) {
      // Fire-and-forget: la expansion de playlists de YouTube es async y no
      // debe bloquear el registro del dominio.
      Promise.resolve(resolveAndSavePlaylist(deps, config.streamerPlaylist)).catch(() => {});
    }

    return { rutas: 21, listeners: 2 };
  },

  shutdown() {
    if (engineInstance) engineInstance.shutdown();
  },
};
