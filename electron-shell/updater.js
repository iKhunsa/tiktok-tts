'use strict';

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

// electron-updater no expone un campo "prerelease" en UpdateInfo — solo
// "version". El provider de GitHub marca un release como prerelease cuando
// el tag trae un segmento semver tipo "-beta.1", asi que detectarlo desde
// ahi es el unico dato real disponible.
function esPrerelease(version) {
  return typeof version === 'string' && version.includes('-');
}

// Lee el flag de cuenta (`auth:get` es un contrato sincrono expuesto por
// features/auth/index.js) y habilita/deshabilita el canal beta justo antes
// de cada chequeo — asi un login/logout entre chequeos se respeta solo, sin
// tener que engancharse a eventos de sesion.
function aplicarCanal(bus) {
  let betaTester = false;
  bus.emit('auth:get', (sesion) => { betaTester = !!(sesion && sesion.user && sesion.user.betaTester); });
  autoUpdater.allowPrerelease = betaTester;
}

function setupAutoUpdater({ app, bus, logger, getMainWindow, getTray, buildTrayMenu, onPendingVersion }) {
  autoUpdater.autoDownload = true;
  // Toda instalacion pasa por el asistente visible (exige aceptar Terminos y
  // Privacidad); con true, al cerrar la app se instalaria en silencio sin licencia.
  autoUpdater.autoInstallOnAppQuit = false;

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
    sendUpdate({ type: 'available', version: info.version, prerelease: esPrerelease(info.version) });
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

    const prerelease = esPrerelease(info.version);
    sendUpdate({ type: 'ready', version: info.version, prerelease });

    // Fallback de dialogo nativo — garantizado sin importar el estado del preload/banner.
    dialog.showMessageBox({
      type: 'info',
      title: prerelease ? 'TikLiveTTS — Versión experimental lista' : 'TikLiveTTS — Actualización lista',
      message: prerelease
        ? `v${info.version} (EXPERIMENTAL) descargada y lista para instalar.`
        : `v${info.version} descargada y lista para instalar.`,
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

  aplicarCanal(bus);
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    logger.log(
      'warn', 'electron-shell', 'electron-shell/updater.js#setupAutoUpdater', 'electron_shell.updater.chequeo_fallido',
      `Fallo el chequeo de actualizaciones: ${err.message}`, { error: err.message }
    );
  });
}

// Chequeo manual (botón "Buscar actualizaciones" de la UI) — mismo flujo que
// el automatico del arranque, re-evaluando el flag de beta por si cambio.
function checkForUpdates(bus) {
  aplicarCanal(bus);
  return autoUpdater.checkForUpdates();
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = { setupAutoUpdater, checkForUpdates, installUpdate, autoUpdater };
