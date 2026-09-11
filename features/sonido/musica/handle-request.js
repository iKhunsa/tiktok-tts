'use strict';

const { resolveFullTrack } = require('./resolve-full-track');
const { advanceMusicQueue } = require('./advance-queue');
const { musicBroadcastState } = require('./broadcast-state');
const { getConfigSnapshot } = require('../config-bridge');
const { MUSIC_DEDUP_WINDOW_MS } = require('./state');

// Secuencia monotona para identificar cada peticion !p mientras se resuelve.
// El front la usa para mostrar un item "buscando…" en la cola y luego
// reemplazarlo por el track real (o quitarlo si falla).
let musicRequestSeq = 0;

/**
 * Consume bot:comando de /bot (Fase 10) en vez de detectar !p directo — esa
 * deteccion se movio a /bot. Migracion de handleMusicRequest.
 */
function handleMusicRequest(deps) {
  return async ({ query, user, userId, platform }) => {
    const { musicState, engine, bus, logger } = deps;

    logger.log(
      'info', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.solicitud_recibida',
      `Solicitud de musica de ${user} (${platform})`, { user, platform }
    );

    const config = getConfigSnapshot(bus);
    if (!config.musicEnabled) {
      logger.log(
        'info', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.deshabilitada',
        `Bot musical deshabilitado, se ignora solicitud de ${user}`, { user, platform }
      );
      return;
    }

    const now = Date.now();
    // Dedup fijo, siempre activo (independiente del cooldown configurable):
    // ignora el mismo comando del mismo usuario si llega duplicado.
    const dedupKey = `${userId}::${query.toLowerCase()}`;
    const lastSeen = musicState.recentCommands.get(dedupKey);
    if (lastSeen && now - lastSeen < MUSIC_DEDUP_WINDOW_MS) {
      logger.log(
        'info', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.comando_duplicado',
        `Comando de musica duplicado ignorado de ${user}`, { user, platform, query }
      );
      return;
    }
    musicState.recentCommands.set(dedupKey, now);
    if (musicState.recentCommands.size > 300) {
      for (const [k, t] of musicState.recentCommands) {
        if (now - t > MUSIC_DEDUP_WINDOW_MS) musicState.recentCommands.delete(k);
      }
    }

    const bannedList = (config.musicBannedUsers || []).map((u) => u.toLowerCase());
    if (bannedList.includes(String(userId || '').toLowerCase()) || bannedList.includes(String(user || '').toLowerCase())) {
      logger.log(
        'info', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.usuario_baneado',
        `Usuario baneado del bot musical: ${user}`, { user, platform, query }
      );
      return;
    }

    if (config.musicUserCooldownMs > 0 && musicState.userLastRequest[userId] &&
        now - musicState.userLastRequest[userId] < config.musicUserCooldownMs) {
      logger.log(
        'info', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.cooldown_activo',
        `Cooldown activo para ${user}`, { user, platform }
      );
      return;
    }

    if (musicState.queue.length >= config.musicMaxQueue) {
      logger.log(
        'warn', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.cola_llena',
        `Cola de musica llena, se ignora solicitud de ${user}`,
        { user, platform, colaActual: musicState.queue.length, colaMaxima: config.musicMaxQueue }
      );
      return;
    }

    // Marcar el cooldown ya aca (antes de los await) para que un evento
    // duplicado llegando mientras esto resuelve sea bloqueado, no procesado dos veces.
    musicState.userLastRequest[userId] = now;

    // Anunciar la peticion apenas pasa los filtros: el front pinta un item
    // "buscando…" en la cola aunque yt-dlp todavia este descargandose /
    // extrayendose (primer !p puede tardar bastante).
    const requestId = `mr${now.toString(36)}${(++musicRequestSeq).toString(36)}`;
    bus.emit('ws:broadcast', { type: 'music-request-pending', requestId, user, platform, query });

    const failRequest = (reason) => {
      bus.emit('ws:broadcast', { type: 'music-request-failed', requestId, query, reason });
    };

    try {
      await engine.ensureReady();
    } catch (error) {
      logger.log(
        'warn', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.motor_no_disponible',
        `Motor de musica no disponible: ${error.message}`, { error: error.message }
      );
      failRequest('engine');
      return;
    }

    let track;
    try {
      track = await resolveFullTrack(deps, query);
    } catch (error) {
      logger.log(
        'warn', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.track_no_encontrado',
        `Error resolviendo track para "${query}": ${error.message}`, { query, error: error.message }
      );
      failRequest('resolve');
      return;
    }
    if (!track) {
      logger.log(
        'warn', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.track_no_encontrado',
        `No se encontro track para "${query}"`, { query }
      );
      failRequest('notfound');
      return;
    }
    logger.log(
      'debug', 'sonido', 'sonido/musica/handle-request.js#handleMusicRequest', 'sonido.musica.track_resuelto',
      `Track resuelto: ${track.title}`, { videoId: track.videoId, title: track.title }
    );

    track.requestedBy = user;
    track.platform = platform;

    const wasEmpty = musicState.queue.length === 0 && !musicState.currentTrack;
    musicState.queue.push(track);
    bus.emit('ws:broadcast', { type: 'music-queued', requestId, track, queue: [...musicState.queue], queueLength: musicState.queue.length });

    if (wasEmpty && !musicState.currentTrack) advanceMusicQueue(deps);
    musicBroadcastState(deps);
  };
}

module.exports = { handleMusicRequest };
