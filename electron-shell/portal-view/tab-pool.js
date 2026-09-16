'use strict';

const crypto = require('crypto');
const { WebContentsView } = require('electron');
const { attachPopupHandling } = require('./popups');

// CRUD de pestanas. Cada entrada: { view, url, title, isLoading, canGoBack,
// canGoForward, hydrated, crashed }. No sabe nada de bounds ni de si el panel
// esta visible — eso lo decide controller.js.
function createTabPool({ session, onTabEvent, onPopupRequest, logger }) {
  const tabs = new Map();

  function emit(tabId) {
    const tab = tabs.get(tabId);
    if (tab && onTabEvent) onTabEvent(tabId, tab);
  }

  function attachEvents(tabId, view) {
    const wc = view.webContents;
    wc.on('did-start-loading', () => {
      const tab = tabs.get(tabId);
      if (!tab) return;
      tab.isLoading = true;
      tab.crashed = false; // una carga nueva (ej. el usuario le dio a Recargar) es la señal de recuperacion
      emit(tabId);
    });
    wc.on('did-stop-loading', () => {
      const tab = tabs.get(tabId);
      if (!tab) return;
      tab.isLoading = false;
      tab.canGoBack = wc.navigationHistory.canGoBack();
      tab.canGoForward = wc.navigationHistory.canGoForward();
      tab.url = wc.getURL();
      emit(tabId);
    });
    wc.on('page-title-updated', (_e, title) => {
      // KNOWN ISSUE: esto no evita que el titulo pise el de la BrowserWindow
      // en Windows — ver el comentario en controller.js#createPortalViewController.
      const tab = tabs.get(tabId);
      if (!tab) return;
      tab.title = title;
      emit(tabId);
    });
    wc.on('did-fail-load', (_e, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
      // -3 = ERR_ABORTED: navegacion cancelada por el propio usuario (ej.
      // clickeo otro link antes de que terminara de cargar) — no es un error
      // real. Fallos de subframes (ads/trackers rotos) tampoco importan aca.
      // Errores reales (DNS, sin conexion, etc.) ya muestran la pagina de
      // error nativa de Chromium dentro del WebContentsView — esto solo
      // asegura que isLoading no se quede pegado en true para siempre.
      if (!isMainFrame || errorCode === -3) return;
      const tab = tabs.get(tabId);
      if (!tab) return;
      tab.isLoading = false;
      emit(tabId);
    });
    wc.on('render-process-gone', (_e, details) => {
      const tab = tabs.get(tabId);
      if (tab) {
        tab.isLoading = false;
        tab.crashed = true;
        emit(tabId);
      }
      logger?.log(
        'error', 'portal-view', 'portal-view/tab-pool.js#attachEvents', 'portalview.pestana.renderer_caido',
        `Renderer de una pestana de PortalView murio (${details.reason})`, { tabId, reason: details.reason, exitCode: details.exitCode }
      );
    });
    wc.on('unresponsive', () => {
      logger?.log(
        'warn', 'portal-view', 'portal-view/tab-pool.js#attachEvents', 'portalview.pestana.no_responde',
        'Una pestana de PortalView dejo de responder', { tabId }
      );
    });
    attachPopupHandling(wc, { onRequestNewTab: (url) => onPopupRequest?.(url) });
  }

  // Crea metadata de la pestana. Si url viene con valor, hidrata de inmediato
  // (el usuario pidio algo concreto, verlo ya). Si url es null (pantalla
  // "nueva pestana"), la WebContentsView se crea recien cuando haga falta via
  // hydrate() — evita gastar un proceso Chromium por cada pestana vacia.
  function createTab(url) {
    const tabId = `tab_${crypto.randomUUID()}`;
    tabs.set(tabId, {
      view: null, url: url || null, title: '', isLoading: false,
      canGoBack: false, canGoForward: false, hydrated: false, crashed: false,
    });
    if (url) hydrate(tabId, url);
    return tabId;
  }

  // Idempotente — si ya esta hidratada no hace nada. targetUrl es opcional:
  // permite hidratar-y-navegar en un solo paso (pestana "nueva pestana" a la
  // que el usuario recien le escribio una URL).
  function hydrate(tabId, targetUrl) {
    const tab = tabs.get(tabId);
    if (!tab || tab.hydrated) return;
    const view = new WebContentsView({
      webPreferences: {
        session,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });
    tab.view = view;
    tab.hydrated = true;
    attachEvents(tabId, view);
    const url = targetUrl || tab.url;
    if (url) {
      tab.url = url;
      view.webContents.loadURL(url);
    }
  }

  // Restaura metadata de una pestana persistida (sin hidratar) usando el
  // mismo id que tenia al guardarse — asi el activeTabId persistido sigue
  // apuntando a la pestana correcta despues de reabrir la app.
  function restoreTab(tabId, url) {
    if (tabs.has(tabId)) return;
    tabs.set(tabId, {
      view: null, url: url || null, title: '', isLoading: false,
      canGoBack: false, canGoForward: false, hydrated: false, crashed: false,
    });
  }

  function getTab(tabId) {
    return tabs.get(tabId) || null;
  }

  function getAllTabs() {
    return Array.from(tabs.entries()).map(([id, t]) => ({ id, ...t }));
  }

  function count() {
    return tabs.size;
  }

  function removeTab(tabId) {
    const tab = tabs.get(tabId);
    if (!tab) return;
    if (tab.view && !tab.view.webContents.isDestroyed()) tab.view.webContents.close();
    tabs.delete(tabId);
  }

  function destroyAll() {
    for (const tabId of Array.from(tabs.keys())) removeTab(tabId);
  }

  return { createTab, restoreTab, hydrate, getTab, getAllTabs, count, removeTab, destroyAll };
}

module.exports = { createTabPool };
