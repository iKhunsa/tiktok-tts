'use strict';

// ── Detalle de una tool (visibilidad + reordenar) ────────────────────────
let _pluginStoreDetailId = null;

function showPluginDetail(id) {
  _pluginStoreDetailId = id;
  const grid = document.getElementById('pluginStoreGrid');
  const detail = document.getElementById('pluginStoreDetail');
  if (grid) grid.style.display = 'none';
  if (detail) detail.style.display = '';
  renderPluginDetail(id);
}

function renderPluginDetail(id) {
  const tool = toolById(id);
  const body = document.getElementById('pluginStoreDetailBody');
  if (!tool || !body) return;

  if (tool.pinned) {
    body.innerHTML = `
      <div class="store-detail-header">
        <img class="store-detail-icon" src="${tool.icon}" alt="">
        <div>
          <h3>${t(tool.labelKey)}</h3>
          <p>${t('store.alwaysVisible')}</p>
        </div>
      </div>`;
    return;
  }

  const prefs = loadSidebarPrefs();
  const isHidden = prefs.hidden.includes(id);
  const visibleOrdered = prefs.order.filter((x) => !prefs.hidden.includes(x));
  const idx = visibleOrdered.indexOf(id);
  const isFirst = idx === 0;
  const isLast = idx === visibleOrdered.length - 1;

  body.innerHTML = `
    <div class="store-detail-header">
      <img class="store-detail-icon" src="${tool.icon}" alt="">
      <div>
        <h3>${t(tool.labelKey)}</h3>
        <p>${t(tool.descKey)}</p>
      </div>
    </div>
    <div class="store-detail-meta">
      <div>
        <span class="store-detail-meta-label">${t('store.metaStatus')}</span>
        <span>${isHidden ? t('store.hiddenBadge') : t('store.visibleBadge')}</span>
      </div>
      <div>
        <span class="store-detail-meta-label">${t('store.metaPosition')}</span>
        <span>${isHidden ? '—' : `${idx + 1} / ${visibleOrdered.length}`}</span>
      </div>
    </div>
    <button class="btn-supabase-primary store-detail-cta" onclick="toggleSidebarTool('${id}', ${isHidden})">
      ${isHidden ? t('store.addToMenu') : t('store.removeFromMenu')}
    </button>
    ${isHidden ? '' : `
    <div class="store-detail-order">
      <span>${t('store.reorderLabel')}</span>
      <button class="store-order-btn" ${isFirst ? 'disabled' : ''} onclick="moveSidebarTool('${id}', -1)" title="${t('store.moveUp')}">▲</button>
      <button class="store-order-btn" ${isLast ? 'disabled' : ''} onclick="moveSidebarTool('${id}', 1)" title="${t('store.moveDown')}">▼</button>
    </div>`}`;
}

function toggleSidebarTool(id, visible) {
  const prefs = loadSidebarPrefs();
  prefs.hidden = visible ? prefs.hidden.filter((x) => x !== id) : [...new Set([...prefs.hidden, id])];
  saveSidebarPrefs(prefs);
  renderSidebar();
  renderPluginGrid();
  if (_pluginStoreDetailId === id) renderPluginDetail(id);
}

function moveSidebarTool(id, delta) {
  const prefs = loadSidebarPrefs();
  const visible = prefs.order.filter((x) => !prefs.hidden.includes(x));
  const i = visible.indexOf(id);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= visible.length) return;
  [visible[i], visible[j]] = [visible[j], visible[i]];
  const hiddenIds = prefs.order.filter((x) => prefs.hidden.includes(x));
  prefs.order = [...visible, ...hiddenIds];
  saveSidebarPrefs(prefs);
  renderSidebar();
  renderPluginGrid();
  if (_pluginStoreDetailId === id) renderPluginDetail(id);
}
