'use strict';
const SysTray = require('systray').default;
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const IS_PKG = typeof process.pkg !== 'undefined';
const REAL_BASE = IS_PKG ? path.dirname(process.execPath) : __dirname;

function getIconBase64() {
  const icoPath = path.join(REAL_BASE, 'tray-icon.ico');
  try {
    return fs.readFileSync(icoPath).toString('base64');
  } catch (e) {
    // Fallback: tiny 1x1 transparent ICO as base64
    return 'AAABAAEAAQEAAAEAGAAAACgAAAABAAAAAgAAAAEAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  }
}

function initTray(port) {
  const tray = new SysTray({
    menu: {
      icon: getIconBase64(),
      title: '',
      tooltip: 'TikTok TTS',
      items: [
        { title: 'Abrir TikTok TTS', tooltip: 'Abrir en navegador', checked: false, enabled: true },
        { title: '──────────', tooltip: '', checked: false, enabled: false },
        { title: 'Salir', tooltip: 'Cerrar la aplicación', checked: false, enabled: true },
      ],
    },
    debug: false,
    copyDir: true,
  });

  tray.onClick((action) => {
    if (action.seq_id === 0) {
      exec(`start http://localhost:${port}`);
    } else if (action.seq_id === 2) {
      tray.kill();
      process.exit(0);
    }
  });

  process.on('SIGINT', () => { tray.kill(); process.exit(0); });
  process.on('SIGTERM', () => { tray.kill(); process.exit(0); });
}

module.exports = { initTray };
