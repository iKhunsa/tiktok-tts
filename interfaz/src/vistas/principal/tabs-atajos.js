export function iniciarTabsAtajos() {
  const tabs = [...document.querySelectorAll('#settingsSectionShortcuts [role="tab"]')];
  const panels = [...document.querySelectorAll('#settingsSectionShortcuts [role="tabpanel"]')];
  if (!tabs.length) return;

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
}
