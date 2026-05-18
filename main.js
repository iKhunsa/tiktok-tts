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

// Start Express server — wrapped so a crash here shows a recoverable dialog
// instead of an unhandled exception that blocks the auto-updater from running.
let serverLoadError = null;
let serverShutdown = null;
try {
  serverShutdown = require('./server').shutdown;
} catch (e) {
  serverLoadError = e;
}

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
let pendingUpdateVersion = null;

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

  // Localhost overlay URLs open in a new Electron window; external URLs go to system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://localhost:${PORT}`)) return { action: 'allow' };
    shell.openExternal(url);
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

// Build tray context menu — rebuilds with an install item when an update is ready
function buildTrayMenu(updateVersion = null) {
  const items = [
    {
      label: 'Abrir TikTok TTS',
      click: () => { mainWindow.show(); mainWindow.focus(); },
    },
    { type: 'separator' },
  ];

  if (updateVersion) {
    items.push({
      label: `⬆️ Instalar v${updateVersion} ahora`,
      click: () => autoUpdater.quitAndInstall(false, true),
    });
    items.push({ type: 'separator' });
  }

  // app.quit() fires before-quit so autoInstallOnAppQuit works
  items.push({ label: 'Salir', click: () => app.quit() });

  return Menu.buildFromTemplate(items);
}

function createTray() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);

  tray.setToolTip('TikTok TTS');
  tray.setContextMenu(buildTrayMenu());
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
  // If server failed to load, show error dialog + trigger auto-update so user
  // gets the fix automatically without needing to reinstall manually.
  if (serverLoadError) {
    if (app.isPackaged) {
      // Try to update first — if a fix is available it will download + install
      try {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall(false, true));
        autoUpdater.checkForUpdates().catch(() => {});
      } catch (_) {}
    }
    dialog.showMessageBox({
      type: 'error',
      title: 'TikTok TTS — Error de inicio',
      message: 'Hubo un error al iniciar la aplicación.',
      detail: `${serverLoadError.message}\n\nSi el problema persiste, descarga la última versión desde GitHub.`,
      buttons: ['Descargar última versión', 'Cerrar'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) shell.openExternal('https://github.com/iKhunsa/tiktok-tts/releases/latest');
      setTimeout(() => app.exit(1), 500);
    });
    return;
  }

  waitForServer(() => {
    createWindow();
    createTray();
    if (app.isPackaged) setupAutoUpdater();

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (mainWindow) mainWindow.webContents.send('mark-clip');
    });
  });
});

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
  }
  if (serverShutdown) {
    try { serverShutdown(); } catch (_) {}
  }
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

  autoUpdater.on('update-downloaded', (info) => {
    pendingUpdateVersion = info.version;

    // Rebuild tray menu with install shortcut — works even if preload/banner is unavailable
    if (tray) tray.setContextMenu(buildTrayMenu(info.version));

    // Send to in-app banner (requires preload to be working)
    sendUpdate({ type: 'ready', version: info.version });

    // Native dialog fallback — guaranteed to work regardless of preload/banner state
    dialog.showMessageBox({
      type: 'info',
      title: 'TikTok TTS — Actualización lista',
      message: `v${info.version} descargada y lista para instalar.`,
      detail: 'La app se reiniciará sola (no requiere reiniciar el PC).\n¿Instalar ahora?',
      buttons: ['Instalar ahora', 'Después'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on('error', (err) =>
    sendUpdate({ type: 'error', message: err.message }));

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

ipcMain.on('install-update', () => {
  // false = not silent (show nothing extra), true = relaunch after install
  // No PC restart required — only app restarts
  autoUpdater.quitAndInstall(false, true);
});

let registeredPauseShortcut = null;
ipcMain.on('register-pause-shortcut', (_event, shortcut) => {
  if (registeredPauseShortcut) {
    try { globalShortcut.unregister(registeredPauseShortcut); } catch (_) {}
    registeredPauseShortcut = null;
  }
  if (shortcut && shortcut.length > 0) {
    try {
      globalShortcut.register(shortcut, () => {
        if (mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send('pause-tts');
      });
      registeredPauseShortcut = shortcut;
    } catch (err) {
      console.error('Failed to register pause shortcut:', err.message);
    }
  }
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
