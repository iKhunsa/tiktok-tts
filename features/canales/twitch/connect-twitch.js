'use strict';

const { MAX_RECONNECT_ATTEMPTS } = require('../state/channel-maps');
const { cleanTwitchChannel } = require('./clean-channel');

function clearReconnectTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

/**
 * Conecta IRC de Twitch (tmi.js) y engancha los handlers de evento. Cada
 * handler solo publica al bus con el dato crudo — subs/cheers/raids/join no
 * tienen un evento canonico de los 5 principales, se agrupan bajo
 * canal:evento-especial con `kind` para que /overlay (Fase 8) los consuma.
 */
async function connectTwitch(deps, channelInput, token = null, attempt = 0) {
  const { state, bus, logger } = deps;
  const tmi = require('tmi.js');
  const channel = cleanTwitchChannel(channelInput);
  if (!channel) throw new Error('Se requiere canal Twitch');

  clearReconnectTimer(state.twitchReconnectTimers, channel);

  if (state.twitchChannels.has(channel)) {
    const prev = state.twitchChannels.get(channel);
    prev._intentionalDisconnect = true;
    try { await prev.disconnect(); } catch (_) { /* best-effort */ }
    state.twitchChannels.delete(channel);
  }

  const clientOpts = { channels: [channel] };
  const effectiveToken = token || (state.authTokens.twitch && state.authTokens.twitch.accessToken);
  if (effectiveToken && state.authTokens.twitch && state.authTokens.twitch.login) {
    clientOpts.identity = { username: state.authTokens.twitch.login, password: `oauth:${effectiveToken}` };
  }

  const client = new tmi.Client(clientOpts);
  client._intentionalDisconnect = false;

  client.on('message', (_ch, tags, message, self) => {
    if (self || !message.trim()) return;
    bus.emit('canal:mensaje-crudo', { platform: 'twitch', channel, raw: { tags, message: message.trim() } });
  });

  const planToTier = (methods) => {
    if (!methods) return { tier: null, tierLabel: '', isPrime: false };
    const isPrime = !!methods.prime || methods.plan === 'Prime';
    const tier = isPrime ? 'prime' : ({ 1000: 1, 2000: 2, 3000: 3 })[methods.plan] || null;
    return { tier, tierLabel: methods.planName || '', isPrime };
  };
  const emitEspecial = (kind, raw) => bus.emit('canal:evento-especial', { platform: 'twitch', channel, kind, raw });

  // No bindear 'sub' ni 'subanniversary': tmi.js los emite junto con
  // 'subscription'/'resub' respectivamente y dispararian doble alerta.
  client.on('subscription', (_ch, username, methods, message) => {
    emitEspecial('sub-nueva', { username, message, ...planToTier(methods) });
  });
  client.on('resub', (_ch, username, streakMonths, message, tags, methods) => {
    const months = parseInt(tags && tags['msg-param-cumulative-months'], 10) || streakMonths || 0;
    emitEspecial('sub-resub', { username, months, streakMonths: streakMonths || 0, message, ...planToTier(methods) });
  });
  client.on('subgift', (_ch, username, _streak, recipient, methods) => {
    emitEspecial('sub-regalo', { username, recipient, ...planToTier(methods) });
  });
  client.on('anonsubgift', (_ch, _streak, recipient, methods) => {
    emitEspecial('sub-regalo', { username: null, recipient, isAnonymous: true, ...planToTier(methods) });
  });
  client.on('submysterygift', (_ch, username, numbOfSubs, methods) => {
    emitEspecial('sub-misterio', { username, giftCount: numbOfSubs || 1, ...planToTier(methods) });
  });
  client.on('anonsubmysterygift', (_ch, numbOfSubs, methods) => {
    emitEspecial('sub-misterio', { username: null, giftCount: numbOfSubs || 1, isAnonymous: true, ...planToTier(methods) });
  });
  client.on('primepaidupgrade', (_ch, username, methods) => {
    emitEspecial('sub-upgrade', { username, ...planToTier(methods) });
  });
  client.on('giftpaidupgrade', (_ch, username, sender) => {
    emitEspecial('sub-upgrade', { username, sender });
  });
  client.on('anongiftpaidupgrade', (_ch, username) => {
    emitEspecial('sub-upgrade', { username });
  });
  client.on('cheer', (_ch, tags, message) => {
    emitEspecial('cheer', { username: tags['display-name'] || tags.username, bits: parseInt(tags.bits, 10) || 0, message });
  });
  client.on('raided', (_ch, username, viewers) => {
    emitEspecial('raid', { username, viewers: parseInt(viewers, 10) || 0 });
  });

  client.on('disconnected', () => {
    bus.emit('canal:estado', { platform: 'twitch', channel, state: 'desconectado' });
    state.twitchChannels.delete(channel);

    if (!client._intentionalDisconnect && attempt < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      logger.log(
        'warn', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.reconectando',
        `Reconectando Twitch ${channel}, intento ${attempt + 1}`, { channel, intento: attempt + 1, delayMs: delay }
      );
      bus.emit('canal:estado', { platform: 'twitch', channel, state: 'reconectando', attempt: attempt + 1, delayMs: delay });
      const timer = setTimeout(() => {
        state.twitchReconnectTimers.delete(channel);
        connectTwitch(deps, channel, effectiveToken, attempt + 1).catch((err) => {
          logger.log(
            'error', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.reconexion_fallida',
            `Fallo reconexion de Twitch ${channel}: ${err.message}`, { channel, error: err.message, stack: err.stack }
          );
        });
      }, delay);
      state.twitchReconnectTimers.set(channel, timer);
    }
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

  await client.connect();
  state.twitchChannels.set(channel, client);

  logger.log(
    'info', 'canales', 'canales/twitch/connect-twitch.js#connectTwitch', 'canales.twitch.conectado',
    `Twitch ${channel} conectado`, { channel }
  );
  bus.emit('canal:estado', { platform: 'twitch', channel, state: 'conectado' });
}

module.exports = { connectTwitch, clearReconnectTimer };
