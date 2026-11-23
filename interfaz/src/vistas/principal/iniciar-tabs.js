/**
 * Pestañas accesibles genéricas: cada [role="tab"] dentro de `lista` controla
 * el panel de su aria-controls. Los paneles se ocultan con `hidden` (no se
 * destruyen), así ids, listeners y valores de los controles siguen vivos.
 * Devuelve `activarPorPanel(panelId)` para cambiar de pestaña desde código.
 */
export function iniciarTabs(lista) {
  const tabs = [...lista.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

  function activarTab(tab, moveFocus = false) {
    const panelId = tab.getAttribute('aria-controls');
    tabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
      item.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.id !== panelId; });
    if (moveFocus) tab.focus();
    else tab.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activarTab(tab));
    tab.addEventListener('keydown', (event) => {
      const destination = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (destination === undefined) return;
      event.preventDefault();
      activarTab(tabs[destination], true);
    });
  });

  return (panelId) => {
    const tab = tabs.find((item) => item.getAttribute('aria-controls') === panelId);
    if (tab) activarTab(tab);
  };
}
