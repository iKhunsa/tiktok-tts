'use strict';

// ── Sidebar: visibilidad + orden ─────────────────────────────────────────
// No toca .view ni switchView() — solo style.display/style.order de los
// botones .sidebar-item ya existentes en index.html.
function renderSidebar() {
  const prefs = loadSidebarPrefs();
  const visibleIds = prefs.order.filter((id) => !prefs.hidden.includes(id));

  SIDEBAR_TOOLS.forEach((tool) => {
    if (tool.pinned) return; // chat/settings nunca se tocan
    const btn = document.querySelector(`.sidebar-item[data-view="${tool.id}"]`);
    if (!btn) return;
    if (prefs.hidden.includes(tool.id)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      btn.style.order = String(1 + visibleIds.indexOf(tool.id));
    }
  });

  const chatBtn = document.querySelector('.sidebar-item[data-view="chat"]');
  if (chatBtn) chatBtn.style.order = '0';
  const moreBtn = document.getElementById('navMoreToolsBtn');
  if (moreBtn) moreBtn.style.order = '9998';
  const settingsBtn = document.getElementById('navSettingsBtn');
  if (settingsBtn) settingsBtn.style.order = '9999';
}
