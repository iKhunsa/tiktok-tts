import { almacenPortalView, aplicarEstadoPortal } from './estado.js';
import {
  mostrarPanelPortalView, ocultarPanelPortalView, actualizarPanelPortalView, sincronizarAnchoPanel,
} from './panel.js';
import { showToast } from '../../../componentes/toast.js';
import { t } from '../../../nucleo/i18n/i18n.js';

// 'started' no se avisa (seria ruido por cada descarga) — solo el resultado.
function handleDownloadEvent({ phase, filename }) {
  if (phase === 'completed') showToast(t('toast.portalDownloadDone', { filename }), 'success');
  else if (phase === 'failed') showToast(t('toast.portalDownloadFailed', { filename }), 'error');
}

function renderPortalView(state) {
  const btn = document.getElementById('sidebarPortalViewBtn');
  if (btn) btn.classList.toggle('active', !!state.open);
  if (state.open) mostrarPanelPortalView();
  else ocultarPanelPortalView();
  actualizarPanelPortalView();
  sincronizarAnchoPanel();
}

export function togglePortalView() {
  if (!window.electronAPI?.portalView) return;
  const { open } = almacenPortalView.getState();
  const call = open ? window.electronAPI.portalView.hide() : window.electronAPI.portalView.show();
  call.then((res) => { if (res?.state) aplicarEstadoPortal(res.state); });
}

export function iniciarPortalView() {
  if (!window.electronAPI?.portalView) return; // fuera de Electron (dev web puro): no-op
  almacenPortalView.subscribe(renderPortalView);
  window.electronAPI.portalView.onStateChanged(aplicarEstadoPortal);
  window.electronAPI.portalView.onDownloadEvent(handleDownloadEvent);
}
