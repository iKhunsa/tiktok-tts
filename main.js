'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, globalShortcut, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');

const PORT = 3000;

// When packaged, point server.js to the extraResources folder for assets
if (app.isPackaged) {
  process.env.TIKTOK_RESOURCES_PATH = process.resourcesPath;
}

// Start Express server inside this process
require('./server');

// Poll until server is accepting connections
function waitForServer(cb, attempts = 0) {
  http.get(`http://localhost:${PORT}/api/status`, () => cb())
    .on('error', () => {
      if (attempts < 30) setTimeout(() => waitForServer(cb, attempts + 1), 200);
    });
}

const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'tray-icon.ico')
  : path.join(__dirname, 'tray-icon.ico');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: ICON_PATH,
    title: 'TikTok TTS',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.removeMenu();

  // Open external links in system browser, not in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${PORT}`) && !url.startsWith(`http://localhost:${PORT}/`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Close → minimize to tray instead of quitting
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir TikTok TTS',
      click: () => { mainWindow.show(); mainWindow.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => { app.exit(0); },
    },
  ]);

  tray.setToolTip('TikTok TTS');
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

ipcMain.handle('open-oauth-window', (_event, { url, callbackPattern }) => {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 520,
      height: 720,
      title: 'Autenticación',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    let finished = false;
    const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

    function cleanup() {
      if (win && !win.isDestroyed()) {
        win.webContents.removeListener('will-redirect', onWillRedirect);
        win.webContents.removeListener('did-navigate', onDidNavigate);
        win.removeListener('closed', onClosed);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function finish(fn, arg) {
      if (finished) return;
      finished = true;
      cleanup();
      if (win && !win.isDestroyed()) win.close();
      fn(arg);
    }

    function onWillRedirect(_e, redirectUrl) {
      if (redirectUrl.includes(callbackPattern)) finish(resolve, redirectUrl);
    }

    function onDidNavigate(_e, navUrl) {
      if (navUrl.includes(callbackPattern)) finish(resolve, navUrl);
    }

    function onClosed() {
      finish(reject, new Error('OAuth cancelado por el usuario'));
    }

    win.webContents.on('will-redirect', onWillRedirect);
    win.webContents.on('did-navigate', onDidNavigate);
    win.on('closed', onClosed);
    win.loadURL(url);

    const timeoutId = setTimeout(() => {
      finish(reject, new Error('OAuth expirado después de 5 minutos'));
    }, OAUTH_TIMEOUT_MS);
  });
});

app.whenReady().then(() => {
  waitForServer(() => {
    createWindow();
    createTray();
    if (app.isPackaged) setupAutoUpdater();

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (mainWindow) mainWindow.webContents.send('mark-clip');
    });
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

function sendUpdate(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-event', data);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () =>
    sendUpdate({ type: 'checking' }));

  autoUpdater.on('update-available', (info) =>
    sendUpdate({ type: 'available', version: info.version }));

  autoUpdater.on('update-not-available', () =>
    sendUpdate({ type: 'not-available' }));

  autoUpdater.on('download-progress', (p) =>
    sendUpdate({
      type: 'progress',
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    }));

  autoUpdater.on('update-downloaded', (info) =>
    sendUpdate({ type: 'ready', version: info.version }));

  autoUpdater.on('error', (err) =>
    sendUpdate({ type: 'error', message: err.message }));

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

ipcMain.on('install-update', () => {
  // false = not silent (show nothing extra), true = relaunch after install
  // No PC restart required — only app restarts
  autoUpdater.quitAndInstall(false, true);
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

app.on('window-all-closed', (e) => e.preventDefault());
