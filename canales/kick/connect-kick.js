'use strict';

const kickBrowserContract = require('../../core/contracts/kick-browser');
const { cleanKickSlug } = require('./clean-slug');
const { handleKickWindowMessage } = require('./handle-event');
const { armKickWatchdog, clearKickWatchdog, WATCHDOG_TIMEOUT_MS } = require('./stale-watchdog');

/**
 * Puente temporal via ventana Electron oculta (ver electron-shell/kick-capture-window.js
 * y core/contracts/kick-browser.js) — este modulo NO abre WebSockets ni hace
 * fetch a Kick directo; solo pide al contrato que abra/cierre la ventana y
 * trackea estado en state.kickChannels.
 */
async function connectKick(deps, channelOrSlug) {
  const { state, bus, logger } = deps;
  const slug = cleanKickSlug(channelOrSlug);
  if (!slug) throw new Error('Kick: ingresa el nombre del canal');

  if (state.kickChannels.has(slug)) {
    disconnectKick(deps, slug);
  }

  logger.log(
    'info', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.conectando',
    `Conectando a Kick ${slug} (ventana de captura oculta)`, { slug }
  );
  bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'conectando' });

  function onStale(staleSlug) {
    logger.log(
      'warn', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.sin_eventos',
      `Kick ${staleSlug} sin mensajes de captura en ${WATCHDOG_TIMEOUT_MS}ms; la ventana puede estar bloqueada o corard.tv cambio su DOM`,
      { slug: staleSlug, timeoutMs: WATCHDOG_TIMEOUT_MS }
    );
    bus.emit('canal:estado', { platform: 'kick', channel: staleSlug, state: 'sin-eventos' });
  }

  await kickBrowserContract.openCapture(slug);

  state.kickChannels.add(slug);
  state.kickSeenIds.set(slug, new Set());
  armKickWatchdog(deps, slug, onStale);

  logger.log(
    'info', 'canales', 'canales/kick/connect-kick.js#connectKick', 'canales.kick.conectado',
    `Kick ${slug} conectado (ventana de captura abierta)`, { slug }
  );
  bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'conectado' });

  return slug;
}

function disconnectKick(deps, channelOrSlug) {
  const { state } = deps;
  const slug = cleanKickSlug(channelOrSlug);
  clearKickWatchdog(state.kickWatchdogTimers, slug);
  state.kickChannels.delete(slug);
  state.kickSeenIds.delete(slug);
  try { kickBrowserContract.closeCapture(slug); } catch (_) { /* best-effort */ }
}

/**
 * Registra, una sola vez por proceso (llamado desde canales/index.js#register),
 * los listeners del bus que reciben lo que manda la ventana oculta via IPC
 * (electron-shell/ipc-bridge.js). Separado de connectKick/disconnectKick
 * porque estos listeners no son por-slug: escuchan todo el trafico de todas
 * las ventanas de Kick abiertas.
 */
function registerKickWindowListeners(deps) {
  const { state, bus } = deps;

  bus.on('canales:kick:ventana-mensaje', ({ slug, payload }) => {
    if (!state.kickChannels.has(slug)) return; // ventana huerfana tras desconectar
    armKickWatchdog(deps, slug, (staleSlug) => {
      bus.emit('canal:estado', { platform: 'kick', channel: staleSlug, state: 'sin-eventos' });
    });
    handleKickWindowMessage(deps, slug, payload);
  }, 'canales');

  bus.on('canales:kick:ventana-estado', ({ slug, state: windowState }) => {
    if (!state.kickChannels.has(slug)) return;
    deps.logger.log(
      'debug', 'canales', 'canales/kick/connect-kick.js#registerKickWindowListeners', 'canales.kick.ventana_estado',
      `Ventana de captura de Kick ${slug}: ${windowState}`, { slug, windowState }
    );
  }, 'canales');
}

module.exports = { connectKick, disconnectKick, registerKickWindowListeners };
