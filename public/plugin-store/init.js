'use strict';

// ── Orquestación de arranque de la Tienda de plugins ─────────────────────
const MORE_TOOLS_NOTICE_KEY = 'tikliveTTS_noticeMoreTools_v1';

// Llamada desde switchView('tools') en index.html cada vez que se entra a
// la vista (ver el `if (name === 'tools')` agregado ahí).
function renderPluginStore() {
  localStorage.setItem(MORE_TOOLS_NOTICE_KEY, '1');
  const badge = document.getElementById('moreToolsNewBadge');
  if (badge) badge.style.display = 'none';
  showPluginGrid();
}

if (localStorage.getItem(MORE_TOOLS_NOTICE_KEY)) {
  const b = document.getElementById('moreToolsNewBadge');
  if (b) b.style.display = 'none';
}
renderSidebar();

// Llamado desde setLanguage() (index.html) al cambiar idioma: la grilla y
// el detalle se arman con innerHTML + t() en el momento del render, así
// que sin este refresh quedan en el idioma viejo hasta salir/reentrar.
function refreshPluginStoreTexts() {
  renderSidebar();
  const detail = document.getElementById('pluginStoreDetail');
  if (detail && detail.style.display !== 'none' && _pluginStoreDetailId) {
    renderPluginDetail(_pluginStoreDetailId);
  } else {
    renderPluginGrid();
  }
}
