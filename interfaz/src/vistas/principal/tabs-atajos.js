import { iniciarTabs } from './iniciar-tabs.js';

export function iniciarTabsAtajos() {
  const lista = document.querySelector('#settingsSectionShortcuts .atajos-tabs');
  if (lista) iniciarTabs(lista);
}
