'use strict';

const { createChannelState } = require('./state/channel-maps');
const { createRateLimiterState, connectRateLimiter } = require('./rate-limit');
const { loadAuthTokens } = require('./twitch/oauth/auth-tokens-store');
const { ensureTwitchAccessToken } = require('./twitch/oauth/ensure-access-token');
const { startTwitchEventSub } = require('./twitch/eventsub/start');
const { saveReplay } = require('./obs/save-replay');
const obsReplayContract = require('../core/contracts/obs-replay');

const { connect } = require('./routes/connect');
const { disconnect } = require('./routes/disconnect');
const { platformsStatus } = require('./routes/platforms-status');
const { platformsConnect } = require('./routes/platforms-connect');
const { platformsDisconnect } = require('./routes/platforms-disconnect');
const { listChannels } = require('./routes/list-channels');
const { addChannel } = require('./routes/add-channel');
const { removeChannel } = require('./routes/remove-channel');
const { obsConnect } = require('./routes/obs-connect');
const { obsDisconnect } = require('./routes/obs-disconnect');
const { obsSaveReplay } = require('./routes/obs-save-replay');
const { oauthStart } = require('./routes/oauth-start');
const { oauthStatus } = require('./routes/oauth-status');
const { oauthDisconnect } = require('./routes/oauth-disconnect');

let channelState = null;

module.exports = {
  name: 'canales',

  register({ app, bus, logger }) {
    const state = createChannelState();
    channelState = state;
    const rateLimiterState = createRateLimiterState();
    const deps = { state, bus, logger };

    loadAuthTokens(deps);

    const rateLimit = connectRateLimiter(rateLimiterState, logger);

    app.post('/api/connect', rateLimit, connect(deps));
    app.post('/api/disconnect', disconnect(deps));
    app.get('/api/platforms/status', platformsStatus(state));
    app.post('/api/platforms/connect', rateLimit, platformsConnect(deps));
    app.post('/api/platforms/disconnect', platformsDisconnect(deps));
    app.get('/api/channels', listChannels(state));
    app.post('/api/channels/add', rateLimit, addChannel(deps));
    app.post('/api/channels/remove', removeChannel(deps));
    app.post('/api/obs/connect', obsConnect(deps));
    app.post('/api/obs/disconnect', obsDisconnect(deps));
    app.post('/api/obs/save-replay', obsSaveReplay(deps));
    // GET/PATCH /api/platform-config ya los monta /configuracion (Fase 2) —
    // ese dominio es el unico dueno de platform-config.json.
    app.get('/api/auth/twitch/start', oauthStart(deps));
    app.get('/api/oauth/status', oauthStatus(state));
    app.post('/api/auth/twitch/disconnect', oauthDisconnect(deps));

    // Contrato sincrono: /clips (Fase 11) necesita saber exito/fallo para
    // responder al usuario que disparo el atajo de teclado.
    obsReplayContract.saveReplay = () => saveReplay(deps);

    // /clips tambien puede pedirlo via bus (fire-and-forget), sin conocer el
    // protocolo OBS WS — /canales/obs lo ejecuta.
    bus.on('canal:obs:guardar-replay', () => {
      try {
        saveReplay(deps);
      } catch (error) {
        logger.log(
          'error', 'canales', 'canales/index.js#register', 'canales.obs.replay_fallido',
          `No se pudo guardar el replay solicitado via bus: ${error.message}`, { error: error.message }
        );
      }
    }, 'canales');

    // /configuracion (Fase 2) pide esto para GET /api/status ("connected"),
    // consumido por advanced.html — sin tocar el Map de canales directo.
    bus.on('canales:tiktok-conectado', (respond) => {
      if (typeof respond === 'function') respond(state.tiktokChannels.size > 0);
    }, 'canales');

    // /overlay (Fase 8) pide refrescar el conteo de followers periodicamente
    // sin tocar los `conn` de TikTok directo (son privados de este dominio).
    bus.on('canales:refrescar-followers', () => {
      for (const [username, entry] of state.tiktokChannels) {
        entry.conn.fetchRoomInfo()
          .then((roomInfo) => {
            bus.emit('canal:estado', { platform: 'tiktok', channel: username, state: 'followers-refrescado', roomInfo });
          })
          .catch((error) => {
            logger.log(
              'warn', 'canales', 'canales/index.js#register', 'canales.tiktok.refresco_followers_fallido',
              `No se pudo refrescar followers de ${username}: ${error.message}`, { channel: username, error: error.message, stack: error.stack }
            );
          });
      }
    }, 'canales');

    // Reanudar sesion OAuth persistida al arrancar (best-effort).
    setTimeout(async () => {
      if (!state.authTokens.twitch) return;
      try {
        await ensureTwitchAccessToken(deps);
        startTwitchEventSub(deps);
      } catch (error) {
        logger.log(
          'warn', 'canales', 'canales/index.js#register', 'canales.twitch_oauth.reanudacion_fallida',
          `No se pudo reanudar la sesion de Twitch: ${error.message}`, { error: error.message }
        );
      }
    }, 1000);

    return { rutas: 14, listeners: 3 };
  },

  shutdown() {
    if (!channelState) return;
    const state = channelState;

    for (const entry of state.tiktokChannels.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      try { entry.conn.removeAllListeners(); entry.conn.disconnect(); } catch (_) { /* best-effort */ }
    }
    state.tiktokChannels.clear();

    for (const c of state.twitchChannels.values()) {
      c._intentionalDisconnect = true;
      try { c.disconnect(); } catch (_) { /* best-effort */ }
    }
    state.twitchChannels.clear();

    for (const c of state.youtubeChannels.values()) {
      try { c.stop('shutdown'); c.removeAllListeners(); } catch (_) { /* best-effort */ }
    }
    state.youtubeChannels.clear();

    if (state.obs.ws) {
      state.obs.intentionalClose = true;
      try { state.obs.ws.close(); } catch (_) { /* best-effort */ }
    }

    state.eventsub.stopped = true;
    if (state.eventsub.ws) {
      try { state.eventsub.ws.removeAllListeners(); state.eventsub.ws.close(); } catch (_) { /* best-effort */ }
    }
  },
};
