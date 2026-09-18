import { almacenPortalView } from './estado.js';
import { t } from '../../../nucleo/i18n/i18n.js';

function activeTab() {
  const { tabs, activeTabId } = almacenPortalView.getState();
  return tabs.find((t) => t.id === activeTabId) || null;
}

function handleNavigate(input) {
  const tab = activeTab();
  if (!tab) return;
  window.electronAPI?.portalView?.navigate(tab.id, input);
}

function handleBack() {
  const tab = activeTab();
  if (tab) window.electronAPI?.portalView?.goBack(tab.id);
}

function handleForward() {
  const tab = activeTab();
  if (tab) window.electronAPI?.portalView?.goForward(tab.id);
}

function handleReload() {
  const tab = activeTab();
  if (tab) window.electronAPI?.portalView?.reload(tab.id);
}

function handleClose() {
  window.electronAPI?.portalView?.hide();
}

// Cierra la sesion de navegacion: destruye pestanas/vistas nativas, pero
// nunca toca cookies/login (eso vive en la particion de Electron, no en las
// pestanas). El usuario puede volver a abrir el navegador y sigue logueado.
function handleCloseSession() {
  window.electronAPI?.portalView?.closeSession();
}

function handleFavorite() {
  const tab = activeTab();
  if (tab) window.electronAPI?.portalView?.toggleFavorite(tab.id);
}

export function crearToolbar() {
  const el = document.createElement('div');
  el.className = 'portal-view-toolbar';
  el.innerHTML = `
    <button type="button" class="icon-btn" id="portalViewBackBtn"
      data-i18n-title="portalView.goBack" title="Atrás">
      <img class="icon-inline" src="icons/arrow_back.svg" alt="">
    </button>
    <button type="button" class="icon-btn" id="portalViewForwardBtn"
      data-i18n-title="portalView.goForward" title="Adelante">
      <img class="icon-inline" src="icons/arrow_forward.svg" alt="">
    </button>
    <button type="button" class="icon-btn" id="portalViewReloadBtn"
      data-i18n-title="portalView.reload" title="Recargar">
      <img class="icon-inline" src="icons/refresh.svg" alt="">
    </button>
    <input type="text" class="portal-view-url" id="portalViewUrl"
      data-i18n-placeholder="portalView.urlPlaceholder" placeholder="Escribe una URL">
    <button type="button" class="icon-btn portal-view-favorite-toggle" id="portalViewFavoriteBtn">
      <img class="icon-inline" alt="">
    </button>
    <button type="button" class="icon-btn" id="portalViewCloseSessionBtn"
      data-i18n-title="portalView.closeSession" title="Cerrar sesión de navegación">
      <img class="icon-inline" src="icons/power_settings_new.svg" alt="">
    </button>
    <button type="button" class="icon-btn" id="portalViewCloseBtn"
      data-i18n-title="portalView.close" title="Cerrar">
      <img class="icon-inline" src="icons/close.svg" alt="">
    </button>
  `;

  el.querySelector('#portalViewBackBtn').addEventListener('click', handleBack);
  el.querySelector('#portalViewForwardBtn').addEventListener('click', handleForward);
  el.querySelector('#portalViewReloadBtn').addEventListener('click', handleReload);
  el.querySelector('#portalViewFavoriteBtn').addEventListener('click', handleFavorite);
  el.querySelector('#portalViewCloseSessionBtn').addEventListener('click', handleCloseSession);
  el.querySelector('#portalViewCloseBtn').addEventListener('click', handleClose);

  const urlInput = el.querySelector('#portalViewUrl');
  urlInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    handleNavigate(urlInput.value);
  });

  return el;
}

// Los botones se activan/desactivan segun canGoBack/canGoForward de la
// pestana activa — no reconstruye DOM, asi que no hace falta re-aplicar i18n.
export function actualizarToolbar(el) {
  const tab = activeTab();
  const urlInput = el.querySelector('#portalViewUrl');
  if (urlInput && document.activeElement !== urlInput) {
    urlInput.value = tab?.url || '';
  }
  el.querySelector('#portalViewBackBtn').disabled = !tab?.canGoBack;
  el.querySelector('#portalViewForwardBtn').disabled = !tab?.canGoForward;
  const favorite = !!tab?.isFavorite;
  const favoriteBtn = el.querySelector('#portalViewFavoriteBtn');
  favoriteBtn.disabled = !/^https?:\/\//.test(tab?.url || '');
  favoriteBtn.title = t(favorite ? 'portalView.favRemove' : 'portalView.favAdd');
  favoriteBtn.setAttribute('aria-label', favoriteBtn.title);
  favoriteBtn.querySelector('img').src = `icons/${favorite ? 'star.svg' : 'star_border.svg'}`;
}
