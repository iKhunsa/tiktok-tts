'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, globalShortcut, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');

const PORT = 3000;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// When packaged, point server.js to the extraResources folder for assets
if (app.isPackaged) {
  process.env.TIKTOK_RESOURCES_PATH = process.resourcesPath;
}
process.env.TIKTOK_USER_DATA_PATH = app.getPath('userData');

// Start Express server — wrapped so a crash here shows a recoverable dialog
// instead of an unhandled exception that blocks the auto-updater from running.
let serverLoadError = null;
let serverShutdown = null;
try {
  serverShutdown = require('./server').shutdown;
} catch (e) {
  serverLoadError = e;
  // In development, surface the real error immediately instead of hiding it
  if (!app.isPackaged) throw e;
}

process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection:', reason);
});

// Poll until server is accepting connections
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
      } catch (_) {}
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

const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'tray-icon.ico')
  : path.join(__dirname, 'tray-icon.ico');

let mainWindow = null;
let tray = null;
let pendingUpdateVersion = null;

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.port === String(PORT);
  } catch (_) {
    return false;
  }
}

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
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.removeMenu();

  // Localhost overlay URLs open in a new Electron window; external URLs go to system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
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
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function buildTrayMenu(updateVersion = null) {
  const items = [
    {
      label: 'Abrir TikTok TTS',
      click: showMainWindow,
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
  tray.on('double-click', showMainWindow);
}

function showStartupError(error) {
  dialog.showMessageBox({
    type: 'error',
    title: 'TikTok TTS - Error de inicio',
    message: 'Hubo un error al iniciar la aplicacion.',
    detail: `${error.message}\n\nSi el problema persiste, descarga la ultima version desde GitHub.`,
    buttons: ['Descargar ultima version', 'Cerrar'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) shell.openExternal('https://github.com/iKhunsa/tiktok-tts/releases/latest');
    setTimeout(() => app.exit(1), 500);
  });
}

ipcMain.handle('open-oauth-window', (_event, { url, callbackPattern }) => {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 520,
      height: 720,
      title: 'Autenticación',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
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
        autoUpdater.checkForUpdates().catch((err) => console.error('[updater] check error:', err.message));
      } catch (_) {}
    }
    showStartupError(serverLoadError);
    return;
  }

  waitForServer(() => {
    createWindow();
    createTray();
    if (app.isPackaged) setupAutoUpdater();

    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (mainWindow) mainWindow.webContents.send('mark-clip');
    });
  }, () => {
    showStartupError(new Error(`El servidor local no respondio en http://127.0.0.1:${PORT}`));
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

  autoUpdater.checkForUpdatesAndNotify().catch((err) => console.error('[updater] notify error:', err.message));
}

ipcMain.on('install-update', () => {
  // false = not silent (show nothing extra), true = relaunch after install
  // No PC restart required — only app restarts
  autoUpdater.quitAndInstall(false, true);
});

const FORBIDDEN_SHORTCUTS = new Set(['Alt+F4', 'Ctrl+C', 'Cmd+C', 'Ctrl+V', 'Cmd+V', 'Ctrl+Alt+Del', 'Ctrl+Shift+Esc', 'Cmd+Shift+Esc']);
const SPECIAL_PAUSE_SHORTCUTS = new Set(['MediaPlayPause', 'F8', 'F9', 'F10', 'F11', 'F12']);

function normalizeShortcut(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') return '';
  return shortcut
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'control') return 'Ctrl';
      if (lower === 'cmdorctrl' || lower === 'commandorcontrol') return 'CommandOrControl';
      if (lower === 'cmd' || lower === 'command') return 'Cmd';
      if (lower === 'option') return 'Alt';
      if (lower === 'arrowup') return 'Up';
      if (lower === 'arrowdown') return 'Down';
      if (lower === 'arrowleft') return 'Left';
      if (lower === 'arrowright') return 'Right';
      if (lower === 'mediaplaypause') return 'MediaPlayPause';
      if (/^f\d{1,2}$/i.test(part)) return part.toUpperCase();
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join('+');
}

function isValidShortcut(shortcut) {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized || normalized.length > 50) return false;
  if (FORBIDDEN_SHORTCUTS.has(normalized)) return false;
  if (SPECIAL_PAUSE_SHORTCUTS.has(normalized)) return true;
  return /^(Ctrl|CommandOrControl|Cmd|Alt|Shift|Super)\+([A-Z0-9]|F\d{1,2})(\+([A-Z0-9]|F\d{1,2}))*$/i.test(normalized);
}

let registeredPauseShortcut = null;

function unregisterPauseShortcut() {
  if (registeredPauseShortcut) {
    try { globalShortcut.unregister(registeredPauseShortcut); } catch (_) {}
    registeredPauseShortcut = null;
  }
}

ipcMain.handle('register-pause-shortcut', (_event, shortcut) => {
  if (!shortcut) {
    unregisterPauseShortcut();
    return { ok: true, shortcut: null };
  }
  const normalized = normalizeShortcut(shortcut);
  if (!isValidShortcut(normalized)) {
    console.error('Invalid or forbidden shortcut rejected:', normalized);
    return { ok: false, shortcut: normalized, error: 'Atajo invalido o reservado por el sistema' };
  }
  unregisterPauseShortcut();
  try {
    const registered = globalShortcut.register(normalized, () => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('pause-tts');
    });
    if (!registered || !globalShortcut.isRegistered(normalized)) {
      return { ok: false, shortcut: normalized, error: 'Windows no permitio registrar este atajo. Prueba F8 o MediaPlayPause.' };
    }
    registeredPauseShortcut = normalized;
    return { ok: true, shortcut: normalized };
  } catch (err) {
    console.error('Failed to register pause shortcut:', err.message);
    return { ok: false, shortcut: normalized, error: err.message };
  }
});

app.on('second-instance', showMainWindow);

app.on('window-all-closed', (e) => e.preventDefault());
