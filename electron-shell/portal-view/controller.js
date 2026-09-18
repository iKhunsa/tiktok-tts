'use strict';

const crypto = require('crypto');
const { getPortalViewSession } = require('./session');
const { createTabPool } = require('./tab-pool');
const { attachDownloadHandling } = require('./downloads');
const { computeBounds, clampPanelWidth, attachResizeListener } = require('./bounds');
const { loadPortalViewData, scheduleFlush, flushSync } = require('./store');
const { normalizeUrl, findFavoriteByUrl } = require('./favorites');
const portalViewContract = require('../../core/contracts/portal-view');
const {
  DEFAULT_PANEL_WIDTH_PCT, CONTENT_TOP_OFFSET_PX, MAX_TABS, COMBINED_MIN_WIDTH_PX, DEFAULT_FAVORITE_ICON,
} = require('./constants');

const DEFAULT_MIN_SIZE = [900, 600];

// RESUELTO (fase 6, re-verificado en vivo): el titulo de la BrowserWindow ya
// no se pisa con el <title> de la pagina de terceros al navegar una pestaña —
// se probo navegando a tiktok.com/Twitch/IANA con el panel abierto y el
// titulo de la ventana ("TikLiveTTS") se mantuvo estable en todos los
// casos. El problema documentado en fases 1-2 ya no se reproduce (ningun
// codigo de este archivo llama setTitle() ni escucha page-title-updated del
// webContents principal — solo tab-pool.js escucha el evento en el
// webContents HIJO de cada pestaña, para actualizar el estado interno). Se
// asume corregido incidentalmente por los cambios de bounds/multi-tab de
// fases posteriores; si reaparece, revisar primero si algo nuevo llama
// mainWindow.setTitle() antes de sospechar de Electron.

// Orquesta session + tab-pool + bounds. Estados: CLOSED (nunca se mostro) |
// BACKGROUND (existe, oculto, sesion viva) | VISIBLE (attached al contentView).
function createPortalViewController({ mainWindow, logger, accountId = 'anonymous' }) {
  const portalSession = getPortalViewSession(accountId);
  const persisted = loadPortalViewData(logger);
  const favorites = persisted.favorites;
  let mode = 'CLOSED';
  let activeTabId = null;
  let panelWidthPx = 0;
  // Se actualiza junto con panelWidthPx en cada punto donde el ancho total de
  // la ventana es conocido (show/resizePanel/setPanelWidth/onBounds) — nunca
  // se recalcula tarde contra mainWindow, que en will-quit ya puede estar
  // destruida (eso hacia que el ancho guardado al cerrar la app cayera
  // siempre al default 0.5 en vez del valor real).
  let panelWidthPct = persisted.panelWidthPct || DEFAULT_PANEL_WIDTH_PCT;
  let detachResize = null;
  let restored = false;

  function setPanelWidthPx(px, totalWidth) {
    panelWidthPx = px;
    if (totalWidth) panelWidthPct = px / totalWidth;
  }

  const pool = createTabPool({
    session: portalSession,
    logger,
    onTabEvent: () => broadcastState(),
    // Un link target="_blank"/window.open dentro de una pestana pide una tab
    // nueva — newTab() ya aplica MAX_TABS y hace el attach/switch.
    onPopupRequest: (url) => newTab(url),
  });

  attachDownloadHandling(portalSession, {
    logger,
    onDownloadEvent: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('portal:download-event', payload);
    },
  });

  // Estado minimo y sin URLs/historial expuesto a MCP — ver
  // core/contracts/portal-view.js. Se declara aca (no al final del archivo)
  // porque necesita cerrar sobre pool/mode/activeTabId ya inicializados.
  portalViewContract.provide(() => ({
    open: mode === 'VISIBLE',
    tabCount: pool.count(),
    activeTabId: mode === 'VISIBLE' ? activeTabId : null,
  }));

  function getState() {
    const tabs = pool.getAllTabs();
    return {
      open: mode === 'VISIBLE',
      mode,
      activeTabId,
      tabCount: tabs.length,
      tabs: tabs.map((t) => ({
        id: t.id, url: t.url, title: t.title, isLoading: t.isLoading,
        canGoBack: t.canGoBack, canGoForward: t.canGoForward, crashed: !!t.crashed,
        isFavorite: !!findFavoriteByUrl(favorites, normalizeUrl(t.url)),
      })),
      panelWidthPct,
      favorites,
    };
  }

  function buildPersistData() {
    const state = getState();
    return {
      panelWidthPct: state.panelWidthPct,
      favorites,
      openTabs: state.tabs.filter((t) => t.url).map((t) => ({ id: t.id, url: t.url })),
      activeTabId: state.activeTabId,
    };
  }

  function broadcastState() {
    scheduleFlush(buildPersistData, logger);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('portal:state-changed', getState());
    }
  }

  // Solo se llama una vez, desde el primer show() de la sesion — nada de esto
  // corre al boot de la app, asi que si el usuario nunca abre el panel no se
  // gasta ni la metadata de las pestanas guardadas. De las pestanas
  // restauradas, solo la que era activeTabId al cerrar se hidrata de
  // inmediato (WebContentsView real); el resto queda como metadata pura y se
  // hidrata recien cuando el usuario le hace switchTab por primera vez.
  function restoreTabsIfNeeded() {
    if (restored) return;
    restored = true;
    const { openTabs, activeTabId: savedActiveId } = persisted;
    if (!openTabs.length) return;
    for (const t of openTabs) {
      if (t && typeof t.id === 'string' && typeof t.url === 'string') pool.restoreTab(t.id, t.url);
    }
    const restoredIds = openTabs.map((t) => t.id);
    const targetId = restoredIds.includes(savedActiveId) ? savedActiveId : restoredIds[restoredIds.length - 1];
    const target = pool.getTab(targetId);
    if (target) {
      pool.hydrate(targetId, target.url);
      activeTabId = targetId;
    }
  }

  function activeView() {
    const tab = activeTabId && pool.getTab(activeTabId);
    return tab && tab.view ? tab.view : null;
  }

  function applyBounds() {
    const view = activeView();
    if (!view || mode !== 'VISIBLE') return;
    const { width, height } = mainWindow.getContentBounds();
    view.setBounds(computeBounds({ contentBounds: { width, height }, panelWidthPx, topOffsetPx: CONTENT_TOP_OFFSET_PX }));
  }

  // Centraliza el swap de vista nativa attacheada al contentView — la usan
  // show(), switchTab(), closeTab() y navigate() (cuando hidrata la pestana
  // activa). Si la nueva pestana todavia no tiene WebContentsView (pantalla
  // "nueva pestana"), simplemente no hay nada que attachear — el HTML de
  // nueva-pestana ocupa el espacio (fase 5).
  function activateTab(tabId) {
    if (activeTabId === tabId) return;
    const oldView = activeView();
    if (oldView && mode === 'VISIBLE') mainWindow.contentView.removeChildView(oldView);
    activeTabId = tabId;
    if (mode === 'VISIBLE') {
      const newView = activeView();
      if (newView) { mainWindow.contentView.addChildView(newView); applyBounds(); }
    }
  }

  function show() {
    if (mode === 'VISIBLE') return getState();
    restoreTabsIfNeeded();

    // Ventana dinamica: el panel necesita LEFT_MIN_PX + MIN_PANEL_WIDTH_PX de
    // ancho combinado — mas que el minWidth:900 pensado para TikLiveTTS solo.
    // Nunca fuerza a agrandar si ya es mas ancha que el piso.
    mainWindow.setMinimumSize(COMBINED_MIN_WIDTH_PX, DEFAULT_MIN_SIZE[1]);
    const [curWidth, curHeight] = mainWindow.getSize();
    if (curWidth < COMBINED_MIN_WIDTH_PX) mainWindow.setSize(COMBINED_MIN_WIDTH_PX, curHeight);

    const { width } = mainWindow.getContentBounds();
    // Siempre re-clampea, no solo la primera vez (panelWidthPx!==0) — si la
    // ventana cambio de tamano (ej. maximizada -> restaurada) mientras el panel
    // estaba BACKGROUND/CLOSED, el valor guardado de la sesion anterior puede
    // ya no ser valido para el ancho actual.
    const desiredPx = panelWidthPx || width * (persisted.panelWidthPct || DEFAULT_PANEL_WIDTH_PCT);
    setPanelWidthPx(clampPanelWidth(desiredPx, width), width);
    if (!activeTabId) activeTabId = pool.createTab(null);

    mode = 'VISIBLE';
    const view = activeView();
    if (view) {
      mainWindow.contentView.addChildView(view);
      applyBounds();
    }

    if (!detachResize) {
      detachResize = attachResizeListener({
        mainWindow,
        getPanelWidthPx: () => panelWidthPx,
        isVisible: () => mode === 'VISIBLE',
        topOffsetPx: CONTENT_TOP_OFFSET_PX,
        onBounds: (bounds, clampedWidthPx) => {
          setPanelWidthPx(clampedWidthPx, mainWindow.getContentBounds().width);
          const v = activeView();
          if (v) v.setBounds(bounds);
          // El resize de VENTANA (incluye maximizar/restaurar) puede recortar
          // panelWidthPx — sin esto, el <aside> del renderer se queda con su
          // flexBasis viejo (valido para el tamano anterior) y .app-layout se
          // comprime de mas. Es menos frecuente que el drag del divisor, el
          // costo de mandar el array de tabs acá es aceptable.
          broadcastState();
        },
      });
    }

    broadcastState();
    return getState();
  }

  function hide() {
    if (mode !== 'VISIBLE') return getState();
    const view = activeView();
    if (view) mainWindow.contentView.removeChildView(view);
    mode = 'BACKGROUND';
    // Restaura el piso original de la ventana pero nunca la encoge a la
    // fuerza — si el usuario la agrando a mano con el panel abierto, se
    // queda asi.
    mainWindow.setMinimumSize(DEFAULT_MIN_SIZE[0], DEFAULT_MIN_SIZE[1]);
    broadcastState();
    return getState();
  }

  // Alta frecuencia (cada frame del drag) — mueve el WebContentsView en
  // tiempo real y devuelve el ancho YA CLAMPEADO (sin broadcastState(), para no
  // saturar IPC con el array de tabs completo en cada pixel de movimiento). El
  // renderer espera esta respuesta antes de tocar su CSS — el backend es la
  // unica autoridad del limite, el front nunca aplica el valor crudo pedido.
  function resizePanel(widthPx) {
    if (mode !== 'VISIBLE') return { panelWidthPx };
    const { width } = mainWindow.getContentBounds();
    setPanelWidthPx(clampPanelWidth(widthPx, width), width);
    applyBounds();
    return { panelWidthPx };
  }

  // Una vez, al soltar el divisor — fija el ancho "definitivo" de la sesion y
  // devuelve el valor ya clampeado para que el renderer corrija cualquier
  // drift acumulado durante el arrastre rapido.
  function setPanelWidth(widthPx) {
    const { width } = mainWindow.getContentBounds();
    setPanelWidthPx(clampPanelWidth(widthPx, width), width);
    if (mode === 'VISIBLE') applyBounds();
    broadcastState();
    return { ok: true, panelWidthPx };
  }

  function navigate(tabId, input) {
    const tab = pool.getTab(tabId);
    if (!tab) return { ok: false, error: 'invalid_tab' };
    const url = normalizeUrl(input);
    if (!url) return { ok: false, error: 'invalid_url' };
    if (!tab.hydrated) {
      pool.hydrate(tabId, url);
      // La pestana paso de "nueva pestana" (sin vista) a tener una
      // WebContentsView real recien ahora — si es la activa, hay que
      // attachearla al contentView (antes no habia nada que attachear).
      if (tabId === activeTabId && mode === 'VISIBLE') {
        const view = activeView();
        if (view) { mainWindow.contentView.addChildView(view); applyBounds(); }
      }
    } else {
      tab.url = url;
      tab.view.webContents.loadURL(url);
    }
    return { ok: true };
  }

  function goBack(tabId) {
    const tab = pool.getTab(tabId);
    if (!tab || !tab.hydrated) return { ok: false, error: 'invalid_tab' };
    if (tab.view.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack();
    return { ok: true };
  }

  function goForward(tabId) {
    const tab = pool.getTab(tabId);
    if (!tab || !tab.hydrated) return { ok: false, error: 'invalid_tab' };
    if (tab.view.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward();
    return { ok: true };
  }

  function reload(tabId) {
    const tab = pool.getTab(tabId);
    if (!tab || !tab.hydrated) return { ok: false, error: 'invalid_tab' };
    tab.view.webContents.reload();
    return { ok: true };
  }

  function addFavorite(label, url, icon) {
    const cleanUrl = normalizeUrl(url);
    const cleanLabel = typeof label === 'string' ? label.trim().slice(0, 60) : '';
    if (!cleanUrl || !cleanLabel || findFavoriteByUrl(favorites, cleanUrl)) return { ok: false, error: 'invalid_favorite' };
    const favorite = {
      id: `fav_${crypto.randomUUID()}`, label: cleanLabel, url: cleanUrl,
      icon: typeof icon === 'string' && icon ? icon : DEFAULT_FAVORITE_ICON,
    };
    favorites.push(favorite);
    broadcastState();
    return { ok: true, favorite };
  }

  function removeFavorite(id) {
    const idx = favorites.findIndex((f) => f.id === id);
    if (idx === -1) return { ok: false, error: 'invalid_favorite' };
    favorites.splice(idx, 1);
    broadcastState();
    return { ok: true };
  }

  function editFavorite(id, { label, url, icon }) {
    const favorite = favorites.find((f) => f.id === id);
    if (!favorite) return { ok: false, error: 'invalid_favorite' };
    const cleanUrl = normalizeUrl(url);
    const cleanLabel = typeof label === 'string' ? label.trim().slice(0, 60) : '';
    if (!cleanUrl || !cleanLabel || findFavoriteByUrl(favorites, cleanUrl, id)) return { ok: false, error: 'invalid_favorite' };
    favorite.label = cleanLabel;
    favorite.url = cleanUrl;
    if (typeof icon === 'string' && icon) favorite.icon = icon;
    broadcastState();
    return { ok: true, favorite };
  }

  function toggleFavorite(tabId) {
    const tab = pool.getTab(tabId);
    const url = normalizeUrl(tab?.url);
    if (!url) return { ok: false, error: 'invalid_favorite' };
    const favorite = findFavoriteByUrl(favorites, url);
    if (favorite) return removeFavorite(favorite.id);
    const hostname = new URL(url).hostname.replace(/^www\./i, '').split('.')[0];
    return addFavorite((tab.title || (hostname && `${hostname[0].toUpperCase()}${hostname.slice(1)}`)).trim(), url);
  }

  function newTab(url) {
    if (pool.count() >= MAX_TABS) return { ok: false, error: 'tab_limit' };
    const tabId = pool.createTab(url || null);
    activateTab(tabId);
    broadcastState();
    return { ok: true, tabId };
  }

  function switchTab(tabId) {
    const tab = pool.getTab(tabId);
    if (!tab) return { ok: false, error: 'invalid_tab' };
    // Pestana restaurada (metadata pura, sin WebContentsView todavia) — se
    // hidrata recien ahora, la primera vez que el usuario la mira de verdad.
    if (!tab.hydrated && tab.url) pool.hydrate(tabId, tab.url);
    activateTab(tabId);
    broadcastState();
    return { ok: true };
  }

  function closeTab(tabId) {
    const tab = pool.getTab(tabId);
    if (!tab) return { ok: false, error: 'invalid_tab' };
    const wasActive = tabId === activeTabId;
    if (wasActive) {
      const view = activeView();
      if (view && mode === 'VISIBLE') mainWindow.contentView.removeChildView(view);
      activeTabId = null;
    }
    pool.removeTab(tabId);
    if (wasActive) {
      const remaining = pool.getAllTabs();
      // Cerrar la ultima pestana no deja el panel vacio — se abre una nueva
      // pestana en blanco, mismo comportamiento que un navegador real.
      const nextId = remaining.length ? remaining[remaining.length - 1].id : pool.createTab(null);
      activateTab(nextId);
    }
    broadcastState();
    return { ok: true };
  }

  // Comun a destroyAll() (quit de la app) y closeSession() (el usuario cierra
  // el navegador sin cerrar la app): destruye toda vista nativa y su proceso
  // Chromium. Nunca toca portalSession — las cookies/login sobreviven, eso es
  // lo que distingue "cerrar sesion de navegacion" de "cerrar sesion logueada".
  function teardownTabs() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const view = activeView();
      if (view && mode === 'VISIBLE') mainWindow.contentView.removeChildView(view);
    }
    if (detachResize) { detachResize(); detachResize = null; }
    pool.destroyAll();
    activeTabId = null;
  }

  // Cierre real, disparado por el usuario (menu del panel) — la app sigue
  // corriendo, la ventana principal sigue viva. Restaura el piso de ventana
  // original y persiste openTabs vacio (asi el proximo boot no intenta
  // rehidratar pestanas que el usuario cerro a proposito).
  function closeSession() {
    teardownTabs();
    mode = 'CLOSED';
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setMinimumSize(DEFAULT_MIN_SIZE[0], DEFAULT_MIN_SIZE[1]);
    flushSync(buildPersistData, logger);
    broadcastState();
    return { ok: true };
  }

  // Se llama una sola vez, en will-quit — la app entera se esta cerrando.
  function destroyAll() {
    flushSync(buildPersistData, logger);
    teardownTabs();
    mode = 'CLOSED';
  }

  return {
    show, hide, navigate, newTab, closeTab, switchTab,
    goBack, goForward, reload, addFavorite, removeFavorite, editFavorite, toggleFavorite,
    resizePanel, setPanelWidth, getState, closeSession, destroyAll,
  };
}

module.exports = { createPortalViewController };
