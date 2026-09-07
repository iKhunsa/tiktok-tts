'use strict';

const { Tray, Menu, nativeImage, dialog, shell } = require('electron');

function buildTrayMenu({ onOpen, onInstallUpdate, onQuit }, updateVersion = null) {
  const items = [
    { label: 'Abrir TikTok TTS', click: onOpen },
    { type: 'separator' },
  ];

  if (updateVersion) {
    items.push({ label: `⬆️ Instalar v${updateVersion} ahora`, click: onInstallUpdate });
    items.push({ type: 'separator' });
  }

  // app.quit() dispara before-quit para que autoInstallOnAppQuit funcione.
  items.push({ label: 'Salir', click: onQuit });

  return Menu.buildFromTemplate(items);
}

function createTray({ iconPath, logger, onOpen, onInstallUpdate, onQuit }) {
  // Resiliente: si la tray no se puede crear, se deja tray=null para que el
  // handler de cierre de ventana y 'window-all-closed' caigan a un quit
  // normal (si no, la app seguiria corriendo sin forma visible de llegar a ella).
  try {
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon);
    tray.setToolTip('TikTok TTS');
    tray.setContextMenu(buildTrayMenu({ onOpen, onInstallUpdate, onQuit }));
    tray.on('double-click', onOpen);
    return tray;
  } catch (error) {
    logger.log(
      'error', 'electron-shell', 'electron-shell/tray.js#createTray', 'electron_shell.tray.creacion_fallida',
      `No se pudo crear el icono de bandeja, se deshabilita minimizar a tray: ${error.message}`, { error: error.message, stack: error.stack }
    );
    return null;
  }
}

function showStartupError(error) {
  return dialog.showMessageBox({
    type: 'error',
    title: 'TikTok TTS - Error de inicio',
    message: 'Hubo un error al iniciar la aplicacion.',
    detail: `${error.message}\n\nSi el problema persiste, descarga la ultima version desde GitHub.`,
    buttons: ['Descargar ultima version', 'Cerrar'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) shell.openExternal('https://github.com/iKhunsa/tiktok-tts/releases/latest');
  });
}

module.exports = { buildTrayMenu, createTray, showStartupError };
