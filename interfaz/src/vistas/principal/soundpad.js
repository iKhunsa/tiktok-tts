import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { escaparHtml as escapeHtml } from '../../../compartido/escapar-html.js';

let _spSounds = [];
let _spCapturing = null; // soundId capturando un atajo
let _spCaptureTimer = null;
let _spIconList = null;
let _spIconTarget = null;

export async function spLoad() {
  try {
    const r = await fetch('/api/soundpad/list');
    _spSounds = await r.json();
  } catch (_) { _spSounds = []; }
  spRender();
}

export function spRender() {
  const deck = document.getElementById('spDeck');
  const empty = document.getElementById('spEmpty');
  const count = document.getElementById('spCount');
  if (!deck) return;
  // spRender() reescribe el DOM: si habia una captura de atajo en curso, su
  // nodo desaparece pero el listener global seguiria pegado. Cancelar primero.
  spCancelCapture();
  if (!_spSounds.length) {
    deck.innerHTML = '';
    if (empty) empty.style.display = '';
    if (count) count.textContent = '0/24';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (count) count.textContent = `${_spSounds.length}/24`;
  const hint = t('soundpad.cardHint') || 'Clic para reproducir · clic derecho para opciones';
  deck.innerHTML = _spSounds.map((s) => {
    const id = escapeHtml(s.id);
    const icon = escapeHtml(s.icon || 'music_note');
    const light = spColorIsLight(s.color) ? ' sp-card--light' : '';
    const badge = s.shortcut ? `<span class="sp-card-badge">${escapeHtml(s.shortcut)}</span>` : '';
    return `<div class="sp-card${light}" id="spcard-${id}" style="--sp-color:${escapeHtml(s.color)}"
      onclick="spPlaySoundWithAnim('${id}')"
      oncontextmenu="return spCardMenu(event,'${id}')"
      title="${escapeHtml(s.name)} — ${hint}">
      ${badge}
      <img class="sp-card-icon" src="/soundpad-icons/${icon}.svg" alt="">
      <div class="sp-card-label">${escapeHtml(s.name)}</div>
    </div>`;
  }).join('');
}

function spColorIsLight(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

export function spCardMenu(e, soundId) {
  e.preventDefault();
  spOpenSettings(soundId);
  return false;
}

export function spPlaySound(soundId) {
  const s = _spSounds.find((x) => x.id === soundId);
  if (!s) return;
  try {
    const audio = new Audio(`/sounds/${encodeURIComponent(s.filename)}`);
    audio.play().catch(() => {});
  } catch (_) { /* noop */ }
}

export function spPlaySoundWithAnim(soundId) {
  spPlaySound(soundId);
  const card = document.getElementById(`spcard-${soundId}`);
  if (card) { card.classList.remove('playing'); void card.offsetWidth; card.classList.add('playing'); }
}

export function spPlayTestSound() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    [[440, 0], [660, 0.15]].forEach(([freq, when]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + 0.4);
    });
  } catch (_) { showToast(t('toast.audioTestFailed')); }
}

export function spUploadTrigger() {
  document.getElementById('spFileInput').click();
}

export async function spHandleUpload(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (_spSounds.length >= 24) { showToast(t('toast.maxSounds')); return; }
  const fd = new FormData();
  fd.append('audio', file);
  try {
    const r = await fetch('/api/soundpad/upload', { method: 'POST', body: fd });
    if (!r.ok) { const e = await r.json(); showToast(tErr(e, 'toast.soundUploadError')); return; }
    const entry = await r.json();
    _spSounds.push(entry);
    spRender();
  } catch (_) { showToast(t('toast.soundUploadError')); }
}

async function spSaveName(soundId, name) {
  const s = _spSounds.find((x) => x.id === soundId);
  const trimmed = (name || '').trim();
  if (!s || !trimmed || s.name === trimmed) return;
  s.name = trimmed;
  spRender();
  await fetch(`/api/soundpad/${soundId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: s.name }) });
}

async function spSaveColor(soundId, color) {
  const s = _spSounds.find((x) => x.id === soundId);
  if (!s || s.color === color) return;
  s.color = color;
  spRender(); // re-render: la clase sp-card--light depende de la luminancia
  await fetch(`/api/soundpad/${soundId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }) });
}

async function spDoDelete(soundId) {
  const idx = _spSounds.findIndex((x) => x.id === soundId);
  if (idx === -1) return;
  if (window.electronAPI?.unregisterSoundpadShortcut) window.electronAPI.unregisterSoundpadShortcut(soundId);
  _spSounds.splice(idx, 1);
  spRender();
  try { await fetch(`/api/soundpad/${soundId}`, { method: 'DELETE' }); } catch (_) { /* noop */ }
}

// ─── Captura de atajo (UI en el modal de configuracion) ───
export function spCaptureShortcut(soundId) {
  spCancelCapture();
  _spCapturing = soundId;
  const el = document.getElementById('spSetShortcut');
  if (el) {
    el.textContent = t('soundpad.pressKey') || 'Presiona tecla…';
    el.classList.add('capturing');
  }
  const btn = document.getElementById('spSetCapture');
  if (btn) btn.disabled = true;
  document.addEventListener('keydown', _spKeyCapture, { capture: true });
  clearTimeout(_spCaptureTimer);
  _spCaptureTimer = setTimeout(() => spCancelCapture(), 10000);
}

/** Idempotente a proposito: se llama tanto desde flujos que saben que hay
 * una captura en curso como desde limpiezas generales (Escape global,
 * spRender) que no lo saben — no hace nada si no habia captura activa. */
export function spCancelCapture() {
  clearTimeout(_spCaptureTimer);
  _spCaptureTimer = null;
  document.removeEventListener('keydown', _spKeyCapture, { capture: true });
  const id = _spCapturing;
  _spCapturing = null;
  const btn = document.getElementById('spSetCapture');
  if (btn) btn.disabled = false;
  if (id) {
    const s = _spSounds.find((x) => x.id === id);
    if (s) spUpdateSettingsShortcut(s);
  }
}

async function _spKeyCapture(e) {
  if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation();
    spCancelCapture();
    return;
  }
  const key = e.key.toUpperCase();
  if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return;
  const mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');
  if (!mods.length) {
    showToast(t('toast.shortcutModifier'));
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const shortcut = [...mods, key].join('+');
  const soundId = _spCapturing;
  clearTimeout(_spCaptureTimer);
  _spCaptureTimer = null;
  document.removeEventListener('keydown', _spKeyCapture, { capture: true });
  _spCapturing = null;
  const btn = document.getElementById('spSetCapture');
  if (btn) btn.disabled = false;
  try {
    const s = _spSounds.find((x) => x.id === soundId);
    if (!s) return;
    s.shortcut = shortcut;
    spUpdateSettingsShortcut(s);
    spRender();
    await fetch(`/api/soundpad/${soundId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shortcut }) });
    if (window.electronAPI?.registerSoundpadShortcut) {
      const result = await window.electronAPI.registerSoundpadShortcut(soundId, shortcut);
      if (!result?.ok) {
        const msg = result?.error === 'conflict' ? t('conn.shortcutConflict') : (result?.error || t('conn.shortcutUnavailable'));
        showToast(msg);
      }
    }
  } catch (_) { /* best-effort: el atajo ya quedo persistido si el PATCH paso */ }
}

// ─── Modal de configuracion de la tarjeta ───
const SP_COLOR_PRESETS = ['#3ecf8e', '#b30af0', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a3e635', '#f5f5f5', '#64748b'];

async function spLoadIconList() {
  if (_spIconList && _spIconList.length) return _spIconList;
  try {
    const r = await fetch('/api/soundpad/icons');
    const data = await r.json();
    _spIconList = Array.isArray(data) ? data : [];
  } catch (_) { _spIconList = []; }
  return _spIconList;
}

export async function spOpenSettings(soundId) {
  const s = _spSounds.find((x) => x.id === soundId);
  if (!s) return;
  _spIconTarget = soundId;
  const nameEl = document.getElementById('spSetName');
  if (nameEl) nameEl.value = s.name;
  const colorEl = document.getElementById('spSetColor');
  if (colorEl) colorEl.value = s.color;
  spRenderColorPresets(s.color);
  spUpdateSettingsShortcut(s);
  spResetDeleteBtn();
  const search = document.getElementById('spIconSearch');
  if (search) search.value = '';
  document.getElementById('spSettingsModal').classList.add('show');
  if (_spIconList) spRenderIconGrid('');
  await spLoadIconList();
  if (_spIconTarget === soundId) spRenderIconGrid('');
}

export function spCloseSettings(e) {
  if (e && e.target.id !== 'spSettingsModal') return;
  spCancelCapture();
  spResetDeleteBtn();
  document.getElementById('spSettingsModal').classList.remove('show');
  _spIconTarget = null;
}

function spCurrentSetting() { return _spSounds.find((x) => x.id === _spIconTarget); }

export function spSetSaveName(v) { if (_spIconTarget) spSaveName(_spIconTarget, v); }

export function spSetSaveColor(v) {
  if (!_spIconTarget) return;
  spSaveColor(_spIconTarget, v);
  const colorEl = document.getElementById('spSetColor');
  if (colorEl) colorEl.value = v;
  spRenderColorPresets(v);
}

function spRenderColorPresets(cur) {
  const box = document.getElementById('spColorPresets');
  if (!box) return;
  box.innerHTML = SP_COLOR_PRESETS.map((c) =>
    `<div class="sp-color-preset${c.toLowerCase() === (cur || '').toLowerCase() ? ' selected' : ''}" style="background:${c}" title="${c}" onclick="spSetSaveColor('${c}')"></div>`,
  ).join('');
}

function spUpdateSettingsShortcut(s) {
  const el = document.getElementById('spSetShortcut');
  if (el) { el.textContent = s.shortcut || (t('soundpad.noShortcut') || 'Sin atajo'); el.classList.remove('capturing'); }
  const clr = document.getElementById('spSetClearShortcut');
  if (clr) clr.disabled = !s.shortcut;
}

export function spSettingsCapture() { if (_spIconTarget) spCaptureShortcut(_spIconTarget); }

export async function spSettingsClearShortcut() {
  const s = spCurrentSetting();
  if (!s || !s.shortcut) return;
  const id = s.id;
  s.shortcut = null;
  spUpdateSettingsShortcut(s);
  spRender();
  if (window.electronAPI?.unregisterSoundpadShortcut) window.electronAPI.unregisterSoundpadShortcut(id);
  try { await fetch(`/api/soundpad/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shortcut: null }) }); } catch (_) { /* noop */ }
}

let _spDeleteArmed = false;
let _spDeleteTimer = null;

export function spResetDeleteBtn() {
  _spDeleteArmed = false;
  clearTimeout(_spDeleteTimer);
  const lbl = document.getElementById('spSetDeleteLabel');
  if (lbl) { lbl.setAttribute('data-i18n', 'soundpad.deleteSound'); lbl.textContent = t('soundpad.deleteSound') || 'Eliminar sonido'; }
}

export async function spSettingsDelete() {
  const s = spCurrentSetting();
  if (!s) return;
  if (!_spDeleteArmed) {
    _spDeleteArmed = true;
    const lbl = document.getElementById('spSetDeleteLabel');
    if (lbl) { lbl.removeAttribute('data-i18n'); lbl.textContent = t('toast.deleteSoundConfirm') || '¿Eliminar este sonido?'; }
    clearTimeout(_spDeleteTimer);
    _spDeleteTimer = setTimeout(spResetDeleteBtn, 4000);
    return;
  }
  const id = s.id;
  spResetDeleteBtn();
  document.getElementById('spSettingsModal').classList.remove('show');
  _spIconTarget = null;
  await spDoDelete(id);
}

export function spFilterIcons(q) { spRenderIconGrid(q); }

function spRenderIconGrid(q) {
  const grid = document.getElementById('spIconGrid');
  const hint = document.getElementById('spIconHint');
  if (!grid) return;
  const s = spCurrentSetting();
  const cur = s ? (s.icon || 'music_note') : null;
  const term = (q || '').trim().toLowerCase();
  const full = term ? _spIconList.filter((n) => n.includes(term)) : _spIconList;
  const list = full.slice(0, 300);
  if (hint) hint.style.display = full.length > 300 ? '' : 'none';
  grid.innerHTML = list.map((n) =>
    `<div class="sp-icon-tile${n === cur ? ' selected' : ''}" onclick="spChooseIcon('${escapeHtml(n)}')" title="${escapeHtml(n)}"><img src="/soundpad-icons/${escapeHtml(n)}.svg" alt="" loading="lazy"></div>`,
  ).join('');
}

export async function spChooseIcon(name) {
  const s = spCurrentSetting();
  if (!s) return;
  const id = s.id;
  s.icon = name;
  spRender();
  spRenderIconGrid(document.getElementById('spIconSearch')?.value || '');
  try {
    await fetch(`/api/soundpad/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon: name }) });
  } catch (_) { /* noop */ }
}

/** Re-registra todos los atajos de sonido al arrancar (una vez que
 * electronAPI esta listo). */
export function spRestoreShortcuts() {
  if (!window.electronAPI?.registerSoundpadShortcut) return;
  _spSounds.forEach((s) => {
    if (s.shortcut) window.electronAPI.registerSoundpadShortcut(s.id, s.shortcut);
  });
}
