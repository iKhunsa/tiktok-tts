'use strict';

const path = require('path');
const http = require('http');
const { BrowserWindow } = require('electron');
const { openExternalSafe } = require('./open-external');

const PORT = process.env.PORT || 3000;

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === String(PORT);
  } catch (_) {
    return false;
  }
}

// Checkout de Polar (sandbox.polar.sh, buy.polar.sh, polar.sh, etc.) -> se
// abre en una ventana Electron propia en vez de mandarlo al navegador del
// sistema, para que el pago se sienta parte de la app.
function isPolarUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'polar.sh' || hostname.endsWith('.polar.sh'));
  } catch (_) {
    return false;
  }
}

function waitForServer(cb, onFailure, attempts = 0) {
  http.get(`http://127.0.0.1:${PORT}/api/status`, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (res.statusCode === 200 && data.app === 'tiktok-tts') {
          cb();
          return;
        }
      } catch (_) { /* respuesta invalida, reintentar */ }
      retryWaitForServer(cb, onFailure, attempts);
    });
  }).on('error', () => {
    retryWaitForServer(cb, onFailure, attempts);
  });
}

function retryWaitForServer(cb, onFailure, attempts) {
  if (attempts < 30) {
    setTimeout(() => waitForServer(cb, onFailure, attempts + 1), 200);
  } else if (onFailure) {
    onFailure();
  }
}

function createWindow({ iconPath, onClose, bus }) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath,
    title: 'TikTok TTS',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
  win.removeMenu();

  // URLs localhost (overlays) y el checkout de Polar abren en una ventana
  // Electron nueva; el resto de URLs externas van al navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1100,
          height: 800,
          minWidth: 800,
          minHeight: 600,
          icon: iconPath,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            preload: path.join(__dirname, '..', 'preload.js'),
          },
        },
      };
    }
    if (isPolarUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 900,
          height: 720,
          minWidth: 700,
          minHeight: 600,
          icon: iconPath,
          autoHideMenuBar: true,
          title: 'TikLive TTS — Pago',
          // Sin preload: es la pagina de pago de un tercero, no expone el
          // puente IPC de la app (electronAPI) ahi adentro.
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
          },
        },
      };
    }
    openExternalSafe(url);
    return { action: 'deny' };
  });

  // Ventana de checkout de Polar: al llegar a la pagina de exito la cierra
  // sola (el usuario ya vio "pago recibido"), y al cerrarse -por exito o
  // porque el usuario la cerro sin pagar- avisa por el bus para que
  // features/auth/ refresque la sesion ya, sin esperar el ciclo de 10 min.
  win.webContents.on('did-create-window', (childWindow, details) => {
    if (!isPolarUrl(details.url)) return;
    childWindow.webContents.on('did-navigate', (_event, navUrl) => {
      if (!navUrl.includes('/checkout/ok')) return;
      setTimeout(() => { if (!childWindow.isDestroyed()) childWindow.close(); }, 1500);
    });
    if (bus) childWindow.on('closed', () => bus.emit('auth:forzar-refresh'));
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });

  win.once('ready-to-show', () => win.show());

  // Close (X) -> apaga todo, no minimiza a tray.
  win.on('close', () => onClose());

  return win;
}

function showMainWindow(win) {
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  }
}

module.exports = { createWindow, showMainWindow, waitForServer, isAppUrl, PORT };
