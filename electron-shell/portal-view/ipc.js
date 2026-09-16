'use strict';

const { ipcMain } = require('electron');

// Canales portal:* — ver electron-shell/ipc-bridge.js para el idiom (handlers
// devuelven { ok, ... } / { ok:false, error }, nunca lanzan). Archivo aparte
// de ipc-bridge.js: son canales propios de un dominio entero, mezclarlos ahi
// rompe cohesion sin ganar nada.
function attachPortalViewIpc({ controller }) {
  ipcMain.handle('portal:show', () => ({ ok: true, state: controller.show() }));
  ipcMain.handle('portal:hide', () => { controller.hide(); return { ok: true }; });
  ipcMain.handle('portal:navigate', (_e, { tabId, input }) => controller.navigate(tabId, input));
  ipcMain.handle('portal:new-tab', (_e, { url }) => controller.newTab(url));
  ipcMain.handle('portal:close-tab', (_e, { tabId }) => controller.closeTab(tabId));
  ipcMain.handle('portal:switch-tab', (_e, { tabId }) => controller.switchTab(tabId));
  ipcMain.handle('portal:panel-resize', (_e, { widthPx }) => controller.resizePanel(widthPx));
  ipcMain.handle('portal:set-panel-width', (_e, { widthPx }) => controller.setPanelWidth(widthPx));
  ipcMain.handle('portal:go-back', (_e, { tabId }) => controller.goBack(tabId));
  ipcMain.handle('portal:go-forward', (_e, { tabId }) => controller.goForward(tabId));
  ipcMain.handle('portal:reload', (_e, { tabId }) => controller.reload(tabId));
  ipcMain.handle('portal:add-favorite', (_e, { label, url, icon }) => controller.addFavorite(label, url, icon));
  ipcMain.handle('portal:remove-favorite', (_e, { id }) => controller.removeFavorite(id));
  ipcMain.handle('portal:edit-favorite', (_e, { id, label, url, icon }) => controller.editFavorite(id, { label, url, icon }));
  ipcMain.handle('portal:close-session', () => controller.closeSession());

  return {
    dispose() {
      ipcMain.removeHandler('portal:show');
      ipcMain.removeHandler('portal:hide');
      ipcMain.removeHandler('portal:navigate');
      ipcMain.removeHandler('portal:new-tab');
      ipcMain.removeHandler('portal:close-tab');
      ipcMain.removeHandler('portal:switch-tab');
      ipcMain.removeHandler('portal:panel-resize');
      ipcMain.removeHandler('portal:set-panel-width');
      ipcMain.removeHandler('portal:go-back');
      ipcMain.removeHandler('portal:go-forward');
      ipcMain.removeHandler('portal:reload');
      ipcMain.removeHandler('portal:add-favorite');
      ipcMain.removeHandler('portal:remove-favorite');
      ipcMain.removeHandler('portal:edit-favorite');
      ipcMain.removeHandler('portal:close-session');
    },
  };
}

module.exports = { attachPortalViewIpc };
