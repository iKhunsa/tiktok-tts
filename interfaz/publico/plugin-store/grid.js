'use strict';

// ── Grid de la Tienda de plugins (vista tipo "All apps") ─────────────────
function showPluginGrid() {
  _pluginStoreDetailId = null;
  const grid = document.getElementById('pluginStoreGrid');
  const detail = document.getElementById('pluginStoreDetail');
  const header = document.getElementById('pluginStoreHeader');
  if (detail) detail.style.display = 'none';
  if (grid) grid.style.display = '';
  if (header) header.style.display = '';
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
    if (!tool || tool.pinned) return;
    const isHidden = !tool.pinned && prefs.hidden.includes(id);
    const badgeClass = tool.pinned ? 'pinned' : (isHidden ? 'hidden' : 'visible');
    const badgeText = tool.pinned ? t('store.alwaysVisible') : (isHidden ? t('store.hiddenBadge') : t('store.visibleBadge'));

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'store-card';
    card.draggable = true;
    card.dataset.toolId = id;
    card.onclick = () => { if (!card.dataset.wasDragged) showPluginDetail(id); delete card.dataset.wasDragged; };
    card.innerHTML = `
      <span class="store-card-badge ${badgeClass}">${badgeText}</span>
      <div class="store-card-icon"><img src="${tool.icon}" alt=""></div>
      <div class="store-card-name">${t(tool.labelKey)}</div>
      <div class="store-card-desc">${tool.pinned ? t('store.alwaysVisible') : t(tool.descKey)}</div>`;
    attachStoreCardDragHandlers(card, id);
    container.appendChild(card);
  });

  const comingSoon = document.createElement('div');
  comingSoon.className = 'store-card store-card-soon';
  comingSoon.innerHTML = `
      <div class="store-card-icon"><img src="icons/build.svg" alt=""></div>
      <div class="store-card-name">${t('store.comingSoon')}</div>
      <div class="store-card-desc">${t('store.comingSoonDesc')}</div>`;
  container.appendChild(comingSoon);
}

// ── Drag & drop estilo Trello: soltar una card sobre otra la inserta antes
// o después según de qué lado quedó el cursor. El array `prefs.order` ya
// mezcla visibles y ocultas, así que reordenar ahí alcanza para las dos
// columnas (Estado no cambia, solo la posición).
let _draggedToolId = null;

function attachStoreCardDragHandlers(card, id) {
  card.addEventListener('dragstart', (e) => {
    _draggedToolId = id;
    card.dataset.wasDragged = '1';
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    _draggedToolId = null;
    document.querySelectorAll('.store-card.drag-over-before, .store-card.drag-over-after')
      .forEach((el) => el.classList.remove('drag-over-before', 'drag-over-after'));
  });
  card.addEventListener('dragover', (e) => {
    if (!_draggedToolId || _draggedToolId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = card.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    card.classList.toggle('drag-over-before', before);
    card.classList.toggle('drag-over-after', !before);
  });
  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over-before', 'drag-over-after');
  });
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    card.classList.remove('drag-over-before', 'drag-over-after');
    if (!_draggedToolId || _draggedToolId === id) return;
    reorderSidebarTool(_draggedToolId, id, before);
  });
}

function reorderSidebarTool(draggedId, targetId, insertBefore) {
  const prefs = loadSidebarPrefs();
  const order = prefs.order.filter((x) => x !== draggedId);
  let idx = order.indexOf(targetId);
  if (idx === -1) return;
  if (!insertBefore) idx += 1;
  order.splice(idx, 0, draggedId);
  prefs.order = order;
  saveSidebarPrefs(prefs);
  renderSidebar();
  renderPluginGrid();
}
