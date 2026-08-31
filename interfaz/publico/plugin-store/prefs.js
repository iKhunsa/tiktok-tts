'use strict';

// ── localStorage: normalize/load/save de la preferencia de sidebar ──────
// { order: [ids no-pinneados en orden], hidden: [ids no-pinneados ocultos] }
const SIDEBAR_PREFS_KEY = 'tikliveTTS_sidebarPrefs_v1';

function normalizeSidebarPrefs(data) {
  const validIds = SIDEBAR_TOOLS.filter((tool) => !tool.pinned).map((tool) => tool.id);
  const raw = (data && typeof data === 'object') ? data : {};
  const rawOrderIds = Array.isArray(raw.order) ? raw.order : [];
  const rawHiddenIds = Array.isArray(raw.hidden) ? raw.hidden : [];

  let order = [...new Set(rawOrderIds.filter((id) => validIds.includes(id)))];
  validIds.forEach((id) => { if (!order.includes(id)) order.push(id); });

  let hidden = [...new Set(rawHiddenIds.filter((id) => validIds.includes(id)))];
  const hadAnyPrefs = rawOrderIds.length > 0 || rawHiddenIds.length > 0;
  validIds.forEach((id) => {
    const knownBefore = rawOrderIds.includes(id) || rawHiddenIds.includes(id);
    if (knownBefore || hidden.includes(id)) return;
    if (!hadAnyPrefs) { if (!SIDEBAR_TOOLS_LEGACY_VISIBLE.includes(id)) hidden.push(id); }
    else hidden.push(id);
  });

  return { order, hidden };
}

function loadSidebarPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(SIDEBAR_PREFS_KEY) || 'null');
    const normalized = normalizeSidebarPrefs(raw);
    if (JSON.stringify(raw) !== JSON.stringify(normalized)) saveSidebarPrefs(normalized);
    return normalized;
  } catch (e) {
    return normalizeSidebarPrefs(null);
  }
}

function saveSidebarPrefs(prefs) {
  try { localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(normalizeSidebarPrefs(prefs))); } catch (e) { /* best-effort */ }
}
