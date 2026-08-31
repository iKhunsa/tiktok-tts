import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { switchView } from './vistas-router.js';
import { startModerationTour } from './tours/index.js';

const MOD_PAGE_SIZE = 100;
const MOD_REFRESH_MS = 15000;
let modTab = 'followers';
let modOffset = 0;
let modTotal = 0;
let modSearchTimer = null;
let modRefreshTimer = null;

function modQuery() {
  const p = new URLSearchParams({
    tab: modTab,
    platform: document.getElementById('modPlatform').value,
    state: document.getElementById('modState').value,
    sort: document.getElementById('modSort').value,
    limit: String(MOD_PAGE_SIZE),
    offset: String(modOffset),
  });
  const q = document.getElementById('modSearch').value.trim();
  if (q) p.set('q', q);
  return p.toString();
}

export async function modReload(resetPage) {
  if (resetPage) modOffset = 0;
  let data;
  try {
    const res = await fetch(`/api/moderation/viewers?${modQuery()}`);
    data = await res.json();
  } catch (_) {
    showToast(t('mod.toast.error'));
    return;
  }
  modTotal = data.total || 0;
  modRenderStats(data.counts || {});
  modRenderRows(data.items || []);
  modRenderPager();
}

function modRenderStats(counts) {
  const total = (counts.followers || 0) + (counts.others || 0);
  document.getElementById('modStatTotal').textContent = total;
  document.getElementById('modStatFollowers').textContent = counts.followers || 0;
  document.getElementById('modStatOthers').textContent = counts.others || 0;
  document.getElementById('modStatMuted').textContent = counts.muted || 0;
  document.getElementById('modStatBanned').textContent = counts.banned || 0;
}

function modFormatAgo(ts) {
  if (!ts) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('mod.time.now');
  if (min < 60) return t('mod.time.min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('mod.time.hour', { n: h });
  return t('mod.time.day', { n: Math.floor(h / 24) });
}

function modFormatUntil(ts) {
  const min = Math.max(1, Math.round((ts - Date.now()) / 60000));
  return min < 60 ? `${min}m` : `${Math.round(min / 60)}h`;
}

function modStatePill(v) {
  const span = document.createElement('span');
  if (v.isBanned) {
    span.className = 'mod-pill banned';
    span.textContent = v.banUntil === -1 ? t('mod.state.banned') : t('mod.state.bannedUntil', { time: modFormatUntil(v.banUntil) });
  } else if (v.isMuted) {
    span.className = 'mod-pill muted';
    span.textContent = v.muteUntil === -1 ? t('mod.state.muted') : t('mod.state.mutedUntil', { time: modFormatUntil(v.muteUntil) });
  } else {
    span.className = 'mod-pill clean';
    span.textContent = t('mod.state.clean');
  }
  return span;
}

// Todo el render usa createElement/textContent: los nombres vienen de
// plataformas externas y no se inyectan nunca como HTML.
function modRenderRows(items) {
  const body = document.getElementById('modTableBody');
  body.textContent = '';
  document.getElementById('modEmpty').style.display = items.length ? 'none' : '';
  document.getElementById('modTable').style.display = items.length ? '' : 'none';

  for (const v of items) {
    const tr = document.createElement('tr');
    tr.dataset.key = v.key;

    const tdUser = document.createElement('td');
    const nick = document.createElement('span');
    nick.className = 'mod-nick';
    nick.textContent = v.nick || v.userId;
    tdUser.appendChild(nick);
    if (v.isFollower) {
      const star = document.createElement('span');
      star.className = 'mod-pill follower';
      star.style.marginLeft = '6px';
      star.textContent = '★';
      star.title = t('chat.followerBadge');
      tdUser.appendChild(star);
    }
    if (v.idKind === 'name') {
      const warn = document.createElement('span');
      warn.className = 'mod-weak-id';
      warn.textContent = '⚠';
      warn.title = t('mod.state.weakId');
      tdUser.appendChild(warn);
    }
    tr.appendChild(tdUser);

    const tdPlat = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `chat-platform-badge badge-${v.platform}`;
    badge.textContent = v.platform;
    tdPlat.appendChild(badge);
    tr.appendChild(tdPlat);

    const tdState = document.createElement('td');
    tdState.appendChild(modStatePill(v));
    tr.appendChild(tdState);

    const tdSeen = document.createElement('td');
    tdSeen.textContent = modFormatAgo(v.lastSeen);
    tr.appendChild(tdSeen);

    // Las acciones ya no viven en la fila: clic en la fila -> menu contextual
    // estilo Windows (igual que el menu del nick en el chat).
    tr.classList.add('mod-row-clickable');
    tr.title = t('chatCtx.hint');
    tr.onclick = (e) => modRowMenu(e, v);

    body.appendChild(tr);
  }
}

/** Menu contextual de una fila del registro de moderacion. Reusa el nodo
 * #userCtxMenu y el submenu de duracion #modDurMenu del chat. */
function modRowMenu(evt, v) {
  evt.stopPropagation();
  modCloseMenus();
  const menu = document.getElementById('userCtxMenu');
  menu.textContent = '';

  const title = document.createElement('div');
  title.className = 'ctx-title';
  title.textContent = `@${v.nick || v.userId}`;
  menu.appendChild(title);

  const addSub = (label, kind, cls) => {
    const b = document.createElement('button');
    b.textContent = label + ' ▸';
    if (cls) b.className = cls;
    b.onclick = (e) => modDurationMenu(e, kind, v.key);
    menu.appendChild(b);
  };
  const addAct = (label, fn, cls) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (cls) b.className = cls;
    b.onclick = async () => { modCloseMenus(); await fn(); };
    menu.appendChild(b);
  };

  addSub(t('mod.action.mute'), 'mute');
  addSub(t('mod.action.ban'), 'ban', 'danger');
  menu.appendChild(document.createElement('hr'));
  addAct(v.isFollower ? t('mod.action.unfollow') : t('mod.action.follow'), () => modApi('follower', { key: v.key, value: !v.isFollower }));
  addAct(t('mod.action.clear'), () => modApi('clear', { key: v.key }));
  menu.appendChild(document.createElement('hr'));
  addAct(t('mod.action.remove'), () => modRemove(v.key), 'danger');

  modPlaceMenu(menu, evt);
}

function modRenderPager() {
  const from = modTotal === 0 ? 0 : modOffset + 1;
  const to = Math.min(modOffset + MOD_PAGE_SIZE, modTotal);
  document.getElementById('modPagerLabel').textContent = t('mod.pager', { from, to, total: modTotal });
  document.getElementById('modPrev').disabled = modOffset === 0;
  document.getElementById('modNext').disabled = to >= modTotal;
}

export function modPage(delta) {
  const next = modOffset + delta * MOD_PAGE_SIZE;
  if (next < 0 || next >= modTotal) return;
  modOffset = next;
  modReload(false);
}

export function modSetTab(tab) {
  modTab = tab;
  document.querySelectorAll('.mod-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  modReload(true);
}

export function modOnSearch() {
  clearTimeout(modSearchTimer);
  modSearchTimer = setTimeout(() => modReload(true), 300);
}

// action ∈ mute | unmute | ban | unban | clear | follower
async function modApi(action, body) {
  try {
    const res = await fetch(`/api/moderation/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    showToast(t(`mod.toast.${action}`));
    return data.viewer;
  } catch (_) {
    showToast(t('mod.toast.error'));
    return null;
  }
}

async function modRemove(key) {
  try {
    await fetch('/api/moderation/viewer', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }),
    });
    modReload(false);
  } catch (_) { showToast(t('mod.toast.error')); }
}

function modWipeKeyword() {
  return (t('mod.wipeModal.keyword') || 'BORRAR').toUpperCase();
}

export function modWipe() {
  document.getElementById('modWipeKeywordHint').textContent = modWipeKeyword();
  const input = document.getElementById('modWipeConfirmInput');
  input.value = '';
  document.getElementById('modWipeConfirmBtn').disabled = true;
  document.getElementById('modWipeConfirmModal').classList.add('show');
  setTimeout(() => input.focus(), 50);
}

export function checkModWipeConfirmInput() {
  const input = document.getElementById('modWipeConfirmInput');
  const match = input.value.trim().toUpperCase() === modWipeKeyword();
  document.getElementById('modWipeConfirmBtn').disabled = !match;
}

export function closeModWipeConfirm(e) {
  if (e && e.target.id !== 'modWipeConfirmModal') return;
  document.getElementById('modWipeConfirmModal').classList.remove('show');
}

export async function confirmModWipe() {
  if (document.getElementById('modWipeConfirmInput').value.trim().toUpperCase() !== modWipeKeyword()) return;
  document.getElementById('modWipeConfirmModal').classList.remove('show');
  try {
    await fetch('/api/moderation/viewers', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    });
    modReload(true);
  } catch (_) { showToast(t('mod.toast.error')); }
}

/** Menu de moderacion al hacer clic en un nick del chat. Un unico nodo
 * reposicionado, nunca uno por mensaje. */
export function openUserMenu(evt, ds) {
  evt.stopPropagation();
  modCloseMenus();
  const menu = document.getElementById('userCtxMenu');
  menu.textContent = '';
  const target = ds.modKey ? { key: ds.modKey } : { platform: ds.platform, nick: ds.nick };

  const title = document.createElement('div');
  title.className = 'ctx-title';
  title.textContent = `@${ds.nick}`;
  menu.appendChild(title);

  const add = (label, fn, cls) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (cls) b.className = cls;
    b.onclick = async () => { modCloseMenus(); await fn(); };
    menu.appendChild(b);
  };

  add(t('chatCtx.mute15'), () => modApi('mute', { ...target, durationMs: 15 * 60 * 1000 }));
  add(t('chatCtx.muteForever'), () => modApi('mute', { ...target, durationMs: null }));
  add(t('chatCtx.ban15'), () => modApi('ban', { ...target, durationMs: 15 * 60 * 1000 }), 'danger');
  add(t('chatCtx.banForever'), () => modApi('ban', { ...target, durationMs: null }), 'danger');
  menu.appendChild(document.createElement('hr'));
  add(t('chatCtx.clear'), () => modApi('clear', target));
  add(t('chatCtx.markFollower'), () => modApi('follower', { ...target, value: true }));
  menu.appendChild(document.createElement('hr'));
  add(t('chatCtx.blockWord'), () => blockWordFromChat());
  add(t('chatCtx.openModeration'), () => {
    document.getElementById('modSearch').value = ds.nick;
    switchView('moderacion');
  });

  modPlaceMenu(menu, evt);
}

// ─── Bloquear palabra al vuelo ──────────────────────────────────
// El streamer copia la palabra del chat y la pega aca. La ventana no se
// cierra al agregar: en una racha de spam se pegan varias seguidas. Reusa
// /api/block-word, el mismo endpoint del panel avanzado.
let blockWordSessionList = [];

export function openBlockWordModal(prefill) {
  const input = document.getElementById('blockWordInput');
  input.value = prefill || '';
  document.getElementById('blockWordModal').classList.add('show');
  refreshBlockWordCount();
  setTimeout(() => { input.focus(); input.select(); }, 50);
}

export function closeBlockWordModal(e) {
  if (e && e.target.id !== 'blockWordModal') return;
  document.getElementById('blockWordModal').classList.remove('show');
  blockWordSessionList = [];
  renderBlockWordSession();
}

async function refreshBlockWordCount() {
  const el = document.getElementById('blockWordCount');
  if (!el) return;
  try {
    const res = await fetch('/api/blocked-words');
    const data = await res.json();
    el.textContent = t('blockWord.count', { n: (data.words || []).length });
  } catch (_) {
    el.textContent = '';
  }
}

export function renderBlockWordSession() {
  const wrap = document.getElementById('blockWordSession');
  const tags = document.getElementById('blockWordSessionTags');
  if (!wrap || !tags) return;
  tags.textContent = '';
  wrap.style.display = blockWordSessionList.length ? '' : 'none';
  for (const w of blockWordSessionList) {
    const tag = document.createElement('span');
    tag.className = 'mod-pill banned';
    tag.textContent = w;
    tags.appendChild(tag);
  }
}

export async function submitBlockWord() {
  const input = document.getElementById('blockWordInput');
  const word = input.value.trim().toLowerCase();
  if (!word) return;
  if (blockWordSessionList.includes(word)) {
    showToast(t('blockWord.duplicate'));
    input.value = '';
    return;
  }
  try {
    const res = await fetch('/api/block-word', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }),
    });
    if (!res.ok) throw new Error('http');
    blockWordSessionList.push(word);
    renderBlockWordSession();
    showToast(t('chatCtx.blockWordDone', { word }));
    input.value = '';
    input.focus();
    refreshBlockWordCount();
  } catch (_) {
    showToast(t('mod.toast.error'));
  }
}

function blockWordFromChat() {
  openBlockWordModal();
}

/** Menu compartido de duraciones. Sirve tanto a la tabla como al menu
 * contextual del chat: un unico nodo reposicionado, nunca uno por fila. */
function modDurationMenu(evt, kind, key) {
  evt.stopPropagation();
  const menu = document.getElementById('modDurMenu');
  menu.textContent = '';
  const options = [
    [t('mod.dur.15m'), 15 * 60 * 1000],
    [t('mod.dur.1h'), 60 * 60 * 1000],
    [t('mod.dur.forever'), null],
  ];
  for (const [label, durationMs] of options) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = async () => {
      modCloseMenus();
      await modApi(kind, { key, durationMs });
    };
    menu.appendChild(b);
  }

  const parent = document.getElementById('userCtxMenu');
  if (parent && parent.style.display !== 'none') {
    menu.style.display = '';
    menu.style.visibility = 'hidden';
    menu.style.left = '0px';
    menu.style.top = '0px';
    const pr = parent.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    let x = pr.right - 2;
    if (x + mr.width > window.innerWidth - 8) x = pr.left - mr.width + 2;
    let y = evt.clientY - 8;
    y = Math.min(y, window.innerHeight - mr.height - 8);
    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;
    menu.style.visibility = '';
  } else {
    modPlaceMenu(menu, evt);
  }
}

function modPlaceMenu(menu, evt) {
  menu.style.display = '';
  menu.style.visibility = 'hidden';
  menu.style.left = '0px';
  menu.style.top = '0px';
  const rect = menu.getBoundingClientRect();
  const x = Math.min(evt.clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(evt.clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;
  menu.style.visibility = '';
}

function modCloseMenus() {
  for (const id of ['modDurMenu', 'userCtxMenu']) {
    const menu = document.getElementById(id);
    if (menu) menu.style.display = 'none';
  }
}

/** Llega tras cualquier accion de moderacion (tambien desde el menu del
 * chat o desde otra ventana). Un cambio de whitelist mueve la fila de
 * pestaña, asi que se recarga la pagina actual en vez de parchear la celda. */
export function modOnViewerUpdated() {
  const view = document.getElementById('view-moderacion');
  if (!view || !view.classList.contains('active')) return;
  modReload(false);
}

// v2: el atajo de palabras bloqueadas dejo de llevar a Avanzado y ahora abre
// una ventana para pegar la palabra. Se vuelve a mostrar el tour por eso.
const MODERATION_TOUR_KEY = 'tikliveTTS_moderationTourSeen_v2';

export function maybeShowModerationTour() {
  if (localStorage.getItem(MODERATION_TOUR_KEY)) return;
  localStorage.setItem(MODERATION_TOUR_KEY, '1');
  // Esperar a que la tabla este pintada: driver.js mide el elemento real.
  setTimeout(startModerationTour, 700);
}

export function modStartAutoRefresh() {
  modStopAutoRefresh();
  modRefreshTimer = setInterval(() => modReload(false), MOD_REFRESH_MS);
}

export function modStopAutoRefresh() {
  if (modRefreshTimer) clearInterval(modRefreshTimer);
  modRefreshTimer = null;
}

export function iniciarMenusModeracion() {
  document.addEventListener('click', modCloseMenus);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modCloseMenus(); });
  // El chat scrollea solo con cada mensaje: el menu quedaria flotando lejos
  // del nick que lo abrio.
  document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chatLog');
    if (chatLog) chatLog.addEventListener('scroll', modCloseMenus);
  });
}
