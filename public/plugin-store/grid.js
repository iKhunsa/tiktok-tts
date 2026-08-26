'use strict';

// ── Grid de la Tienda de plugins (vista tipo "All apps") ─────────────────
function showPluginGrid() {
  _pluginStoreDetailId = null;
  const grid = document.getElementById('pluginStoreGrid');
  const detail = document.getElementById('pluginStoreDetail');
  if (detail) detail.style.display = 'none';
  if (grid) grid.style.display = '';
  renderPluginGrid();
}

// Orden de las cards: fija (chat) + orden guardado + fija (settings) —
// misma lógica que renderSidebar(), así la grilla refleja el orden real.
function renderPluginGrid() {
  const prefs = loadSidebarPrefs();
  const container = document.getElementById('pluginStoreGrid');
  if (!container) return;
  container.innerHTML = '';

  const orderedIds = ['chat', ...prefs.order, 'settings'];
  orderedIds.forEach((id) => {
    const tool = toolById(id);
    if (!tool) return;
    const isHidden = !tool.pinned && prefs.hidden.includes(id);
    const badgeClass = tool.pinned ? 'pinned' : (isHidden ? 'hidden' : 'visible');
    const badgeText = tool.pinned ? t('store.alwaysVisible') : (isHidden ? t('store.hiddenBadge') : t('store.visibleBadge'));

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'store-card';
    card.dataset.toolId = id;
    card.onclick = () => showPluginDetail(id);
    card.innerHTML = `
      <span class="store-card-badge ${badgeClass}">${badgeText}</span>
      <div class="store-card-icon"><img src="${tool.icon}" alt=""></div>
      <div class="store-card-name">${t(tool.labelKey)}</div>
      <div class="store-card-desc">${tool.pinned ? t('store.alwaysVisible') : t(tool.descKey)}</div>`;
    container.appendChild(card);
  });
}
