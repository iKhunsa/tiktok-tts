'use strict';

// Genera favicon.ico + iconos PNG desde interfaz/publico/logo-icon.svg
// usando el Chromium de Electron para rasterizar. Uso: npm run make-icon
// Después empaqueta el .ico con PIL (ver make-app-icon.py).

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG = fs.readFileSync(path.join(ROOT, 'interfaz', 'publico', 'logo-icon.svg'), 'utf8');
const OUT = path.join(__dirname, '_iconbuild');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({
    show: false,
    width: 256,
    height: 256,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: false },
  });

  for (const s of SIZES) {
    const svg = SVG.replace('<svg ', `<svg width="${s}" height="${s}" `);
    const html = `<!doctype html><html><body style="margin:0;background:transparent">` +
      `<div style="width:${s}px;height:${s}px;line-height:0">${svg}</div></body></html>`;
    await win.setContentSize(s, s);
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 150));
    const img = await win.capturePage({ x: 0, y: 0, width: s, height: s });
    fs.writeFileSync(path.join(OUT, `icon-${s}.png`), img.toPNG());
    process.stdout.write(`ok ${s}px\n`);
  }
  win.destroy();
  app.quit();
});
