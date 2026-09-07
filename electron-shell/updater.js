'use strict';

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function setupAutoUpdater({ app, bus, logger, getMainWindow, getTray, buildTrayMenu, onPendingVersion }) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendUpdate = (data) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send('update-event', data);
  };

  autoUpdater.on('checking-for-update', () => {
    bus.emit('update:check');
    sendUpdate({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    bus.emit('update:available', { from: app.getVersion(), to: info.version });
    sendUpdate({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => sendUpdate({ type: 'not-available' }));

  autoUpdater.on('download-progress', (p) => sendUpdate({
    type: 'progress', percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond,
  }));

  autoUpdater.on('update-downloaded', (info) => {
    onPendingVersion(info.version);
    bus.emit('update:downloaded', { from: app.getVersion(), to: info.version });

    // Reconstruye el menu de tray con el atajo de instalar — funciona
    // incluso si el preload/banner no esta disponible.
    const tray = getTray();
    if (tray) tray.setContextMenu(buildTrayMenu(info.version));

    sendUpdate({ type: 'ready', version: info.version });

    // Fallback de dialogo nativo — garantizado sin importar el estado del preload/banner.
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

  autoUpdater.on('error', (err) => {
    bus.emit('update:error', { message: err.message });
    sendUpdate({ type: 'error', message: err.message });
    logger.log(
      'error', 'electron-shell', 'electron-shell/updater.js#setupAutoUpdater', 'electron_shell.updater.error',
      `Error del auto-updater: ${err.message}`, { error: err.message, stack: err.stack }
    );
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    logger.log(
      'warn', 'electron-shell', 'electron-shell/updater.js#setupAutoUpdater', 'electron_shell.updater.chequeo_fallido',
      `Fallo el chequeo de actualizaciones: ${err.message}`, { error: err.message }
    );
  });
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = { setupAutoUpdater, installUpdate, autoUpdater };
