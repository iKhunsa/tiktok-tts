'use strict';

const { app, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const { ensureSingleInstance } = require('./electron-shell/single-instance');
const { createWindow, showMainWindow, waitForServer, PORT } = require('./electron-shell/window');
const { createTray, buildTrayMenu, showStartupError } = require('./electron-shell/tray');
const { setupAutoUpdater, installUpdate } = require('./electron-shell/updater');
const { attachIpcBridge } = require('./electron-shell/ipc-bridge');
const { startUiohook, stopUiohook, isUiohookActive, registerUiohookShortcut } = require('./electron-shell/uiohook');
const { GLOBAL_SHORTCUT } = require('./features/clips/global-shortcut');
const telemetryRuntime = require('./features/telemetria/runtime');
const glitchtip = require('./electron-shell/glitchtip');

// Cuando empaquetado, apunta server.js a extraResources para los assets.
if (app.isPackaged) {
  process.env.TIKTOK_RESOURCES_PATH = process.resourcesPath;
}
process.env.TIKTOK_USER_DATA_PATH = app.getPath('userData');

// GlitchTip (error tracking) — se inicia lo antes posible, antes de cargar
// server.js, para captar hasta un fallo de arranque de los dominios. El
// enganche al bus (attach) viene después, cuando ya existe el logger.
glitchtip.init({
  appVersion: app.getVersion(),
  isDebug: !app.isPackaged,
  userDataDir: app.getPath('userData'),
  logger: null,
});

let mainWindow = null;
let tray = null;
let isQuitting = false;
let pendingUpdateVersion = null;
let quitTasksDone = false;
let ipcHandles = null;

ensureSingleInstance(app, () => showMainWindow(mainWindow));

// Arranca /core + los 16 dominios de negocio (server.js ya no tiene logica
// propia desde la Fase 1). Envuelto para mostrar un dialogo recuperable en
// vez de una excepcion sin manejar que bloquee al auto-updater.
let serverLoadError = null;
let serverModule = null;
try {
  serverModule = require('./server');
} catch (error) {
  serverLoadError = error;
  if (!app.isPackaged) throw error;
}

const bus = serverModule && serverModule.bus;
const logger = serverModule && serverModule.logger;

if (bus) glitchtip.attach(bus, logger);

if (bus && logger) {
  process.on('uncaughtException', (error) => {
    logger.log(
      'fatal', 'electron-shell', 'main.js#uncaughtException', 'core.boundary.excepcion_capturada',
      `Excepcion no capturada en el proceso main: ${error.message}`, { error: error.message, stack: error.stack }
    );
  });
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.log(
      'fatal', 'electron-shell', 'main.js#unhandledRejection', 'core.boundary.excepcion_capturada',
      `Promesa rechazada sin manejar en main: ${error.message}`, { error: error.message, stack: error.stack }
    );
  });
}

const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'tray-icon.ico')
  : path.join(__dirname, 'tray-icon.ico');

function getMainWindow() { return mainWindow; }
function getTray() { return tray; }

function readJsonField(file, field, validate) {
  try {
    if (!fs.existsSync(file)) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'))[field];
    if (typeof value !== 'string' || !value.trim()) return null;
    if (validate && !validate(value.trim())) return null;
    return value.trim();
  } catch (_) {
    return null;
  }
}

// La URL/token de telemetria salen de TELEMETRY_URL+TELEMETRY_TOKEN (override
// de dev), de telemetry.json en userData (override manual), o de
// telemetry-config.json bakeado en el build. Archivo aparte a proposito:
// config.json lo gestiona /configuracion, que descarta claves desconocidas y
// borraria esta en el primer guardado.
function resolveTelemetryUrl() {
  if (process.env.TELEMETRY_URL) return process.env.TELEMETRY_URL.trim();
  const userFile = path.join(app.getPath('userData'), 'telemetry.json');
  const isHttpUrl = (v) => /^https?:\/\//i.test(v);
  const fromUser = readJsonField(userFile, 'url', isHttpUrl);
  if (fromUser) return fromUser;
  const bundledFile = path.join(process.env.TIKTOK_RESOURCES_PATH || __dirname, 'telemetry-config.json');
  return readJsonField(bundledFile, 'url', isHttpUrl);
}

function resolveIngestToken() {
  if (process.env.TELEMETRY_TOKEN) return process.env.TELEMETRY_TOKEN.trim();
  const userFile = path.join(app.getPath('userData'), 'telemetry.json');
  const fromUser = readJsonField(userFile, 'token');
  if (fromUser) return fromUser;
  const bundledFile = path.join(process.env.TIKTOK_RESOURCES_PATH || __dirname, 'telemetry-config.json');
  return readJsonField(bundledFile, 'token');
}

function trayCallbacks() {
  return {
    onOpen: () => showMainWindow(mainWindow),
    onInstallUpdate: installUpdate,
    onQuit: () => app.quit(),
  };
}

app.whenReady().then(() => {
  if (serverLoadError) {
    // Intenta actualizar primero — si hay un fix disponible, se descarga e
    // instala automaticamente sin que el usuario tenga que reinstalar a mano.
    if (app.isPackaged) {
      try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall(false, true));
        autoUpdater.checkForUpdates().catch(() => { /* best-effort */ });
      } catch (_) { /* best-effort */ }
    }
    showStartupError(serverLoadError);
    return;
  }

  waitForServer(() => {
    mainWindow = createWindow({
      iconPath: ICON_PATH,
      onClose: () => {
        if (isQuitting) return;
        isQuitting = true;
        app.quit();
      },
    });

    tray = createTray({ iconPath: ICON_PATH, logger, ...trayCallbacks() });

    if (app.isPackaged) {
      setupAutoUpdater({
        app,
        bus,
        logger,
        getMainWindow,
        getTray,
        buildTrayMenu: (version) => buildTrayMenu(trayCallbacks(), version),
        onPendingVersion: (version) => { pendingUpdateVersion = version; },
      });
    }

    telemetryRuntime.init({
      url: resolveTelemetryUrl(),
      token: resolveIngestToken(),
      appVersion: app.getVersion(),
      dataDir: app.getPath('userData'),
      bus,
      logger,
    });

    startUiohook(logger);

    ipcHandles = attachIpcBridge({ app, bus, logger, getMainWindow, globalShortcut });

    // Atajo de clip (Ctrl+Shift+M): manda IPC al renderer, que hace su
    // propio bookmark local (elapsed/toast) y llama POST /api/obs/save-replay
    // (front sin cambios). /clips (Fase 11) sirve al comando movil markClip,
    // que no tiene renderer del que colgar un bookmark local — ese camino
    // pasa por bus.emit('clips:marcar') en vez de IPC.
    const clipCallback = () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('mark-clip');
    };
    const clipShortcutOk = isUiohookActive()
      ? registerUiohookShortcut('clip', GLOBAL_SHORTCUT, clipCallback)
      : globalShortcut.register(GLOBAL_SHORTCUT, clipCallback);
    if (!clipShortcutOk && logger) {
      logger.log(
        'warn', 'electron-shell', 'main.js#registerClipShortcut', 'electron_shell.atajo_clip_fallido',
        `No se pudo registrar el atajo de clip ${GLOBAL_SHORTCUT} (¿otra app lo tiene tomado?)`,
        { atajo: GLOBAL_SHORTCUT, via: isUiohookActive() ? 'uiohook' : 'globalShortcut' }
      );
    }
  }, () => {
    showStartupError(new Error(`El servidor local no respondio en http://127.0.0.1:${PORT}`));
  });
});

app.on('before-quit', (event) => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
  }

  // El handler se vuelve a disparar tras el app.quit() de abajo; la segunda
  // vez solo tiene que dejar pasar el cierre.
  if (quitTasksDone) return;
  quitTasksDone = true;

  // El shutdown ordenado de los dominios de negocio ya corre en
  // process.on('exit') dentro de server.js (Fase 1) — aca solo se pospone
  // el quit lo justo para que telemetria y GlitchTip alcancen a mandar/flushear
  // (en 'will-quit' el proceso ya murio antes de que la peticion salga).
  const cierres = [];
  if (telemetryRuntime.enabled) cierres.push(telemetryRuntime.shutdown({ timeoutMs: 1500 }));
  if (glitchtip.enabled) cierres.push(glitchtip.shutdown());
  if (cierres.length) {
    event.preventDefault();
    Promise.allSettled(cierres).finally(() => app.quit());
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (ipcHandles) ipcHandles.clearSoundpadShortcuts();
  stopUiohook();
});

// Mantiene la app viva en la tray solo cuando la tray realmente existe y no
// se esta cerrando; si no, deja que Electron cierre normal para no dejar un
// proceso huerfano corriendo sin ventana visible.
app.on('window-all-closed', (e) => {
  if (tray && !isQuitting) {
    e.preventDefault();
  } else {
    app.quit();
  }
});
