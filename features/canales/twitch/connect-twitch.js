'use strict';

const { cleanTwitchChannel } = require('./clean-channel');
const { armWatchdog, clearWatchdog, WATCHDOG_TIMEOUT_MS } = require('../stale-watchdog');
const { assertNoConexionEnCurso } = require('../connecting-lock');
const { reconnectDelayMs } = require('../reconnect-delay');

function clearReconnectTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

function scheduleReconnect(deps, channel, attempt) {
  const { state, bus, logger } = deps;
  if (!state.twitchReconnectDesired.has(channel)) return;
  const delay = reconnectDelayMs(attempt);
  logger.log(
    'warn', 'canales', 'canales/twitch/connect-twitch.js#scheduleReconnect', 'canales.twitch.reconectando',
    `Reconectando Twitch ${channel}, intento ${attempt + 1}`, { channel, intento: attempt + 1, delayMs: delay }
  );
  bus.emit('canal:estado', { platform: 'twitch', channel, state: 'reconectando', attempt: attempt + 1, delayMs: delay });
  const timer = setTimeout(() => {
    state.twitchReconnectTimers.delete(channel);
    connectTwitch(deps, channel, attempt + 1).catch((err) => {
      logger.log(
        'error', 'canales', 'canales/twitch/connect-twitch.js#scheduleReconnect', 'canales.twitch.reconexion_fallida',
        `Fallo reconexion de Twitch ${channel}: ${err.message}`, { channel, error: err.message, stack: err.stack }
      );
      scheduleReconnect(deps, channel, attempt + 1);
    });
  }, delay);
  state.twitchReconnectTimers.set(channel, timer);
}

/**
 * Conecta IRC de Twitch (tmi.js) y engancha los handlers de evento. Cada
 * handler solo publica al bus con el dato crudo — subs/cheers/raids/join no
 * tienen un evento canonico de los 5 principales, se agrupan bajo
 * canal:evento-especial con `kind` para que /overlay (Fase 8) los consuma.
 *
 * Conexion SIEMPRE anonima: este cliente es solo-lectura (no hay .say() en
 * ningun lado). Un cliente anonimo (justinfan) lee todo el chat, incluidos los
 * USERNOTICE de subs/cheers/raids y las salas solo-sub. Pasarle `identity` con
 * el token OAuth (que es de EventSub y caduca a las ~4 h, sin refresh en este
 * path) solo agregaba un modo de fallo: token vencido -> tmi.js rechaza con
 * "Login unsuccessful" -> el chat entero se caia y reintentaba 5x con el mismo
 * token muerto (GlitchTip #63).
 */
async function connectTwitch(deps, channelInput, attempt = 0) {
  const { state } = deps;
  const tmi = require('tmi.js');
  const channel = cleanTwitchChannel(channelInput);
  if (!channel) throw new Error('Se requiere canal Twitch');

  assertNoConexionEnCurso(state.connectingTwitch, channel);

  try {
    return await connectTwitchLocked(deps, tmi, channel, attempt);
  } finally {
    state.connectingTwitch.delete(channel);
  }
}

async function connectTwitchLocked(deps, tmi, channel, attempt) {
  const { state, bus, logger } = deps;
  const staleKey = `twitch:${channel}`;
  clearReconnectTimer(state.twitchReconnectTimers, channel);
  clearWatchdog(state, staleKey);

  if (state.twitchChannels.has(channel)) {
    const prev = state.twitchChannels.get(channel);
    prev._intentionalDisconnect = true;
    try { await prev.disconnect(); } catch (_) { /* best-effort */ }
    state.twitchChannels.delete(channel);
  }

  const client = new tmi.Client({ channels: [channel] });
  client._intentionalDisconnect = false;

  // Socket mudo: 5 min sin ningun 'message'. Un chat sano re-arma en cada
  // mensaje, asi que solo dispara contra una conexion IRC muerta. Fuerza una
  // reconexion limpia (attempt 0); connectTwitch ya descarta el client viejo
  // al arrancar, no duplica. Guard de identidad para no pisar un client nuevo.
  const onStale = () => {
    if (state.twitchChannels.get(channel) !== client) return;
    clearWatchdog(state, staleKey);
    logger.log(
      'warn', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.sin_eventos',
      `Twitch ${channel} sin 'message' en ${WATCHDOG_TIMEOUT_MS}ms; forzando reconexion`,
      { channel, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    scheduleReconnect(deps, channel, 0);
  };

  client.on('message', (_ch, tags, message, self) => {
    armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);
    if (self || !message.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'twitch', channel, raw: { tags, message: message.trim() } });
  });

  client.on('disconnected', () => {
    // Guard de identidad (mismo patron que onStale): si este client ya no es
    // la entrada vigente del Map (perdio la carrera de connectTwitch contra
    // otra conexion), no borrar la entrada del ganador ni reportar/reconectar.
    if (state.twitchChannels.get(channel) !== client) return;
    clearWatchdog(state, staleKey);
    bus.emit('canal:estado', { platform: 'twitch', channel, state: 'desconectado' });
    state.twitchChannels.delete(channel);

    if (!client._intentionalDisconnect) scheduleReconnect(deps, channel, 0);
  });

  // Defensivo: si tmi.js llegara a emitir 'error' en el EventEmitter (algunas
  // versiones lo hacen ante fallos de socket) y no hay listener, seria una
  // excepcion no capturada del proceso.
  client.on('error', (error) => {
    logger.log(
      'warn', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.cliente_error',
      `Error del cliente tmi.js para ${channel}: ${error && error.message}`, { channel, error: error && error.message }
    );
  });

  logger.log(
    'info', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.conectando',
    `Conectando a Twitch ${channel}`, { channel }
  );
  bus.emit('canal:estado', { platform: 'twitch', channel, state: 'conectando' });

  // tmi.js rechaza connect() con un string (this.reason: "Unable to connect.",
  // "Connection closed."…), no un Error. Normalizar aca — asi todo caller
  // (rutas HTTP, reconexion, watchdog) recibe un Error con .message real en vez
  // de loguear/responder "undefined" (GlitchTip #63).
  try {
    await client.connect();
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
  if (attempt > 0 && !state.twitchReconnectDesired.has(channel)) {
    client._intentionalDisconnect = true;
    await client.disconnect();
    return channel;
  }
  state.twitchChannels.set(channel, client);
  state.twitchReconnectDesired.add(channel);
  armWatchdog(state, staleKey, WATCHDOG_TIMEOUT_MS, onStale);

  logger.log(
    'info', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.conectado',
    `Twitch ${channel} conectado`, { channel }
  );
  bus.emit('canal:estado', { platform: 'twitch', channel, state: 'conectado' });
}

function disconnectTwitch(deps, channelInput) {
  const { state } = deps;
  const channel = cleanTwitchChannel(channelInput);
  state.twitchReconnectDesired.delete(channel);
  clearReconnectTimer(state.twitchReconnectTimers, channel);
  clearWatchdog(state, `twitch:${channel}`);
  const client = state.twitchChannels.get(channel);
  if (client) {
    client._intentionalDisconnect = true;
    state.twitchChannels.delete(channel);
    return client.disconnect().catch(() => undefined);
  }
  return undefined;
}

module.exports = { connectTwitch, disconnectTwitch, clearReconnectTimer };
