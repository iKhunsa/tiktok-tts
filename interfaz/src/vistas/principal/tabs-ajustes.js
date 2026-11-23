import { iniciarTabs } from './iniciar-tabs.js';

let activarPanel = null;

export function iniciarTabsAjustes() {
  const lista = document.getElementById('ajustesTabs');
  if (lista) activarPanel = iniciarTabs(lista);
}

/** Muestra la pestaña de Ajustes que contiene `panelId` (los tours la usan para llegar a su elemento). */
export function mostrarPanelAjustes(panelId) {
  activarPanel?.(panelId);
}
