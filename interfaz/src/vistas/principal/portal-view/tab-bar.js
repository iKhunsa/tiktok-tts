import { almacenPortalView } from './estado.js';
import { showToast } from '../../../componentes/toast.js';
import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

function handleSwitch(tabId) {
  window.electronAPI?.portalView?.switchTab(tabId);
}

function handleClose(e, tabId) {
  e.stopPropagation();
  window.electronAPI?.portalView?.closeTab(tabId);
}

function handleNewTab() {
  window.electronAPI?.portalView?.newTab().then((res) => {
    if (!res?.ok && res?.error === 'tab_limit') showToast(t('toast.portalTabLimit'), 'error');
  });
}

function tituloChip(tab) {
  if (tab.title) return tab.title;
  if (tab.url) {
    try { return new URL(tab.url).hostname; } catch (_) { return tab.url; }
  }
  return t('portalView.newTab');
}

export function crearTabBar() {
  const el = document.createElement('div');
  el.className = 'portal-view-tab-bar';
  return el;
}

// Reconstruye los chips desde cero en cada cambio — a lo sumo MAX_TABS (6)
// elementos, diffear no compra nada acá. El titulo/host viene de una pagina
// no confiable: siempre textContent, nunca innerHTML.
export function actualizarTabBar(barEl) {
  const { tabs, activeTabId } = almacenPortalView.getState();
  barEl.innerHTML = '';

  for (const tab of tabs) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'portal-view-tab' + (tab.id === activeTabId ? ' active' : '');
    chip.title = tab.title || tab.url || '';
    chip.addEventListener('click', () => handleSwitch(tab.id));

    const label = document.createElement('span');
    label.className = 'portal-view-tab-label';
    label.textContent = tituloChip(tab);
    chip.appendChild(label);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'portal-view-tab-close';
    closeBtn.setAttribute('data-i18n-title', 'portalView.closeTab');
    closeBtn.innerHTML = '<img class="icon-inline" src="icons/close.svg" alt="">';
    closeBtn.addEventListener('click', (e) => handleClose(e, tab.id));
    chip.appendChild(closeBtn);

    barEl.appendChild(chip);
  }

  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.className = 'portal-view-tab-new icon-btn';
  newBtn.setAttribute('data-i18n-title', 'portalView.newTab');
  newBtn.innerHTML = '<img class="icon-inline" src="icons/add.svg" alt="">';
  newBtn.addEventListener('click', handleNewTab);
  barEl.appendChild(newBtn);

  aplicarTraducciones(barEl);
}
