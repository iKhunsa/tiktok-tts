// PLACEHOLDER TEMPORAL — reemplazado fase a fase, ver /plan-fases
'use strict';

const path = require('path');
const http = require('http');
const { app, BrowserWindow } = require('electron');

require('./server.js');

const PORT = process.env.PORT || 3000;

function waitForServer(cb, attempts = 0) {
  http
    .get(`http://127.0.0.1:${PORT}/api/status`, (res) => {
      if (res.statusCode === 200) {
        res.resume();
        cb();
        return;
      }
      res.resume();
      retry(cb, attempts);
    })
    .on('error', () => retry(cb, attempts));
}

function retry(cb, attempts) {
  if (attempts < 30) {
    setTimeout(() => waitForServer(cb, attempts + 1), 200);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
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

  win.loadURL(`http://127.0.0.1:${PORT}`);
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  waitForServer(createWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
