'use strict';

/**
 * Puente temporal a Kick: en vez de conectar directo a la API/Pusher de
 * Kick (bloqueado por Cloudflare para requests de Node segun se documento
 * en CLAUDE.md — ese bloqueo puede haber cambiado, pendiente de evaluar),
 * esta iteracion abre una ventana Electron oculta que carga el overlay
 * publico de terceros https://kick-chat.corard.tv y raspa su DOM ya
 * renderizado via MutationObserver (ver kick-capture-preload.js).
 *
 * Riesgo aceptado y documentado: si corard.tv cambia su HTML/CSS, la
 * captura se rompe en silencio salvo por el watchdog de /canales/kick.
 * Solucion puente hasta migrar a conexion directa/proxy propio.
 */

const path = require('path');
const { BrowserWindow } = require('electron');

const CORARD_BASE_URL = 'https://kick-chat.corard.tv/v1/chat';

/** slug -> BrowserWindow */
const windows = new Map();

function buildCaptureUrl(slug) {
  const params = new URLSearchParams({
    user: slug,
    'font-size': 'Medium',
    stroke: 'Off',
    animate: 'false',
    badges: 'false',
    commands: 'false',
    bots: 'false',
  });
  return `${CORARD_BASE_URL}?${params.toString()}`;
}

function openKickCaptureWindow({ slug, bus, logger }) {
  return new Promise((resolve, reject) => {
    if (windows.has(slug)) {
      closeKickCaptureWindow(slug);
    }

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'kick-capture-preload.js'),
        additionalArguments: [`--kick-slug=${slug}`],
      },
    });

    let settled = false;

    win.webContents.on('did-finish-load', () => {
      if (settled) return;
      settled = true;
      windows.set(slug, win);
      logger.log(
        'info', 'electron-shell', 'electron-shell/kick-capture-window.js#openKickCaptureWindow', 'electron_shell.kick.ventana_lista',
        `Ventana de captura de Kick lista para ${slug}`, { slug }
      );
      resolve();
    });

    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      if (settled) return;
      settled = true;
      reject(new Error(`No se pudo cargar el overlay de captura de Kick: ${errorDescription} (${errorCode})`));
    });

    win.on('closed', () => {
      const wasTracked = windows.get(slug) === win;
      windows.delete(slug);
      if (wasTracked) {
        bus.emit('canal:estado', { platform: 'kick', channel: slug, state: 'desconectado' });
        logger.log(
          'warn', 'electron-shell', 'electron-shell/kick-capture-window.js#openKickCaptureWindow', 'canales.kick.ventana_cerrada',
          `Ventana de captura de Kick para ${slug} se cerro inesperadamente`, { slug }
        );
      }
    });

    win.loadURL(buildCaptureUrl(slug));
  });
}

function closeKickCaptureWindow(slug) {
  const win = windows.get(slug);
  if (!win) return;
  windows.delete(slug);
  try { if (!win.isDestroyed()) win.destroy(); } catch (_) { /* best-effort */ }
}

function closeAllKickCaptureWindows() {
  for (const slug of Array.from(windows.keys())) closeKickCaptureWindow(slug);
}

module.exports = { openKickCaptureWindow, closeKickCaptureWindow, closeAllKickCaptureWindows };
