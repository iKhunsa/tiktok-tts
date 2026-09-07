'use strict';

const path = require('path');
const http = require('http');
const { BrowserWindow, shell } = require('electron');

const PORT = process.env.PORT || 3000;

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === String(PORT);
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

function createWindow({ iconPath, onClose }) {
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

  // URLs localhost (overlays) abren en una ventana Electron nueva; URLs
  // externas van al navegador del sistema.
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
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
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
