'use strict';

const path = require('path');
const { getPortalViewSession } = require('../portal-view/session');
const { createTabPool } = require('../portal-view/tab-pool');
const { normalizeUrl } = require('../portal-view/favorites');

const PICKER_PRELOAD = path.join(__dirname, 'picker-preload.js');

const enteros = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), width: Math.max(0, Math.round(b.width)), height: Math.max(0, Math.round(b.height)) });
const boundsValidos = (b) => b && ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(b[k]));

/**
 * Navegador del buscador de GIFs: una sola pestana de Portal View (misma sesion persistente, mismo pool de
 * pestanas y mismo manejo de popups) colocada en el rectangulo que el renderer le indica, en vez de anclada
 * al borde derecho. Cada pagina carga el selector (picker-preload.js) en su mundo aislado.
 */
function createGifBrowserController({ mainWindow, logger, accountId = 'anonymous', port, fetchFn = fetch }) {
  const pool = createTabPool({
    session: getPortalViewSession(accountId),
    logger,
    preload: PICKER_PRELOAD,
    onTabEvent: () => emitirEstado(),
    // Un enlace que abre ventana nueva se carga en la misma pestana: este navegador solo tiene una.
    onPopupRequest: (url) => navegar(url),
  });
  let tabId = null;
  let visible = false;
  let bounds = null;
  let textos = {};
  let volumen = 50; // volumen de la ventana del navegador de sonidos (0-100); la app lo recuerda y lo pasa al abrir
  let modo = 'gif'; // 'gif' | 'sonido': que detecta el selector y a que biblioteca importa (la pestana es una sola)
  let importando = false;

  const vista = () => (tabId && pool.getTab(tabId)?.view) || null;
  const enviar = (canal, datos) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(canal, datos); };

  function getState() {
    const tab = tabId && pool.getTab(tabId);
    return {
      abierto: !!tab, visible, modo, url: tab?.url || '', titulo: tab?.title || '', cargando: !!tab?.isLoading,
      puedeVolver: !!tab?.canGoBack, puedeAvanzar: !!tab?.canGoForward,
    };
  }
  function emitirEstado() { enviar('gifbrowser:state', getState()); }

  function colocar() {
    const view = vista();
    if (view && visible && bounds) view.setBounds(bounds);
  }
  function adjuntar() {
    const view = vista();
    if (view && visible) { mainWindow.contentView.addChildView(view); colocar(); }
  }

  function mostrar(nuevosBounds) {
    if (!boundsValidos(nuevosBounds)) return { ok: false, error: 'invalid_bounds' };
    bounds = enteros(nuevosBounds);
    visible = true;
    adjuntar();
    colocar();
    emitirEstado();
    return { ok: true };
  }

  function ocultar() {
    const view = vista();
    if (view && visible) mainWindow.contentView.removeChildView(view);
    visible = false;
    emitirEstado();
    return { ok: true };
  }

  function navegar(input) {
    const url = normalizeUrl(input);
    if (!url) return { ok: false, error: 'invalid_url' };
    if (!tabId) tabId = pool.createTab(null);
    const tab = pool.getTab(tabId);
    if (!tab.hydrated) { pool.hydrate(tabId, url); adjuntar(); } else { tab.url = url; tab.view.webContents.loadURL(url); }
    emitirEstado();
    return { ok: true };
  }

  const conPestana = (accion) => { const view = vista(); if (view) accion(view.webContents); return { ok: !!view }; };

  // El renderer fija los textos del selector (estan traducidos alla); el picker los pide al cargar cada pagina.
  // Si la seccion que abre es otra (GIF <-> sonidos) la pestana se lleva a su pagina y el selector se recarga con el modo nuevo.
  function abrir({ bounds: b, url, textos: t, modo: nuevoModo }) {
    textos = t && typeof t === 'object' ? t : {};
    if (Number.isFinite(textos.volumen)) volumen = Math.min(100, Math.max(0, Math.round(textos.volumen)));
    const cambioModo = (nuevoModo === 'sonido' ? 'sonido' : 'gif') !== modo;
    modo = nuevoModo === 'sonido' ? 'sonido' : 'gif';
    const mostrado = mostrar(b);
    if (!mostrado.ok) return mostrado;
    return url && (cambioModo || !tabId || !pool.getTab(tabId)?.hydrated) ? navegar(url) : mostrado;
  }

  function cerrar() {
    ocultar();
    if (tabId) pool.removeTab(tabId); // destruir la vista cierra su proceso; la sesion (cookies, login) sobrevive
    tabId = null;
    emitirEstado();
    return { ok: true };
  }

  // El selector mueve el control de volumen de la ventana: se recuerda y la app lo guarda para la proxima vez.
  function setVolumen(evento, nuevo) {
    if (!esNuestro(evento) || !Number.isFinite(nuevo)) return { ok: false };
    volumen = Math.min(100, Math.max(0, Math.round(nuevo)));
    enviar('gifbrowser:volumen', { volumen });
    return { ok: true };
  }

  // Los canales del picker solo valen si vienen de la pagina principal de nuestra pestana, no de un subframe ni de otra ventana.
  function esNuestro(evento) {
    const view = vista();
    return !!view && evento.sender === view.webContents && evento.senderFrame === view.webContents.mainFrame;
  }

  // El picker pide importar un GIF: se entrega al dominio gifs por HTTP local, que valida la URL, descarga y guarda.
  async function importar(evento, datos) {
    if (!esNuestro(evento)) return { ok: false, codigo: 'no_autorizado' };
    if (importando) return { ok: false, codigo: 'ocupado' };
    const { url, titulo, origen } = datos || {};
    if (typeof url !== 'string' || !normalizeUrl(url)) return { ok: false, codigo: 'url_invalida' };
    importando = true;
    try {
      const respuesta = await fetchFn(`http://127.0.0.1:${port}/api/${modo === 'sonido' ? 'sonidos' : 'gifs'}/importar`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, titulo: typeof titulo === 'string' ? titulo : '', origen: typeof origen === 'string' ? origen : '' }),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) return { ok: false, codigo: cuerpo.codigo || 'descarga_fallida' };
      enviar('gifbrowser:importado', { item: cuerpo.item, duplicado: !!cuerpo.duplicado, modo });
      return { ok: true, duplicado: !!cuerpo.duplicado };
    } catch (error) {
      logger?.log('warn', 'gif-browser', 'gif-browser/controller.js#importar', 'gifbrowser.importar.fallo', `No se pudo hablar con el dominio gifs: ${error.message}`, { error: error.message });
      return { ok: false, codigo: 'descarga_fallida' };
    } finally {
      importando = false;
    }
  }

  return {
    abrir,
    setBounds: mostrar,
    ocultar,
    cerrar,
    navegar,
    atras: () => conPestana((wc) => { if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); }),
    adelante: () => conPestana((wc) => { if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); }),
    recargar: () => conPestana((wc) => wc.reload()),
    getState,
    getTextos: (evento) => (esNuestro(evento) ? { ...textos, modo, volumen } : {}),
    setVolumen,
    importar,
    destroyAll: () => { cerrar(); pool.destroyAll(); },
  };
}

module.exports = { createGifBrowserController };
