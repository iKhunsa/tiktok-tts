'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
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
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.removeMenu();

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

app.whenReady().then(() => {
  waitForServer(() => {
    createWindow();
    createTray();
    if (app.isPackaged) setupAutoUpdater();
  });
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización lista',
      message: 'Hay una nueva versión de TikTok TTS. Se instalará al cerrar la app.',
      buttons: ['Instalar ahora', 'Después'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

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
