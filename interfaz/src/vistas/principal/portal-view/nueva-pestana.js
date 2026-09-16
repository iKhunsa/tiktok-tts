import { almacenPortalView } from './estado.js';
import { showToast } from '../../../componentes/toast.js';
import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

let _pvIconList = null;
async function cargarIconos() {
  if (_pvIconList?.length) return _pvIconList;
  try { const r = await fetch('/api/soundpad/icons'); const data = await r.json(); _pvIconList = Array.isArray(data) ? data : []; } catch (_) { _pvIconList = []; }
  return _pvIconList;
}
function srcIcono(icon) { return icon ? `/soundpad-icons/${encodeURIComponent(String(icon))}.svg` : 'icons/arrow_forward.svg'; }
function icono(icon, className = 'portal-view-shortcut-icon') { const img = document.createElement('img'); img.className = className; img.src = srcIcono(icon); img.alt = ''; return img; }
function navegar(url) { const { activeTabId } = almacenPortalView.getState(); if (activeTabId) window.electronAPI?.portalView?.navigate(activeTabId, url); }
// Igual criterio que electron-shell/portal-view/controller.js#normalizeUrl:
// el usuario suele pegar un dominio sin protocolo (ej. "youtube.com").
function hostnameDe(input) {
  const raw = (input || '').trim();
  if (!raw) return null;
  for (const candidate of [raw, `https://${raw}`]) {
    try { return new URL(candidate).hostname; } catch (_) { /* probar siguiente */ }
  }
  return null;
}

function crearTarjeta(item, removable, onEdit) {
  const row = document.createElement('div'); row.className = 'portal-view-shortcut';
  const main = document.createElement('button'); main.type = 'button'; main.className = 'portal-view-shortcut-main'; main.title = item.url;
  main.append(icono(item.icon)); const label = document.createElement('span'); label.className = 'portal-view-shortcut-label'; label.textContent = item.label; main.append(label); main.addEventListener('click', () => navegar(item.url)); row.append(main);
  if (!removable) return row;
  const actions = document.createElement('div'); actions.className = 'portal-view-shortcut-actions';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'portal-view-shortcut-more'; trigger.setAttribute('aria-label', t('portalView.favoriteOptions') || 'Opciones'); trigger.setAttribute('aria-expanded', 'false');
  const dots = document.createElement('span'); dots.className = 'portal-view-more-dots'; trigger.append(dots); actions.append(trigger); row.append(actions);
  let menu;
  const close = () => { menu?.remove(); menu = null; trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  const outside = (e) => { if (!actions.contains(e.target)) close(); }; const escape = (e) => { if (e.key === 'Escape') close(); };
  trigger.addEventListener('click', (e) => {
    e.stopPropagation(); if (menu) return close(); menu = document.createElement('div'); menu.className = 'portal-view-favorite-menu'; menu.setAttribute('role', 'menu');
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = t('portalView.editFavorite') || 'Editar'; edit.addEventListener('click', () => { close(); onEdit(item); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = t('btn.delete') || 'Eliminar'; remove.addEventListener('click', () => {
      close(); window.electronAPI?.portalView?.removeFavorite(item.id);
    });
    menu.append(edit, remove); actions.append(menu); trigger.setAttribute('aria-expanded', 'true'); document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape);
  });
  return row;
}

function crearModal() {
  const backdrop = document.createElement('div'); backdrop.className = 'portal-view-favorite-modal'; backdrop.hidden = true;
  const form = document.createElement('form'); form.className = 'portal-view-favorite-dialog'; form.setAttribute('role', 'dialog'); form.setAttribute('aria-modal', 'true');
  const url = document.createElement('input'); url.type = 'text'; url.required = true; url.maxLength = 2048; url.placeholder = t('portalView.favoriteUrlPlaceholder') || 'Pega o escribí el link';
  const label = document.createElement('input'); label.type = 'text'; label.required = true; label.maxLength = 60; label.placeholder = t('portalView.favoriteLabelPlaceholder') || 'Nombre';
  const iconButton = document.createElement('button'); iconButton.type = 'button'; iconButton.className = 'portal-view-icon-picker'; const preview = icono(null, 'portal-view-icon-preview'); iconButton.append(preview);
  const picker = document.createElement('div'); picker.className = 'portal-view-icon-picker-popover'; picker.hidden = true;
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = t('soundpad.iconSearchPlaceholder') || 'Buscar ícono…'; const grid = document.createElement('div'); grid.className = 'portal-view-icon-grid'; picker.append(search, grid);
  const actions = document.createElement('div'); actions.className = 'portal-view-modal-actions'; const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'portal-view-modal-cancel'; cancel.textContent = t('btn.cancel') || 'Cancelar'; const save = document.createElement('button'); save.type = 'submit'; save.className = 'portal-view-modal-save'; actions.append(cancel, save); form.append(url, label, iconButton, picker, actions); backdrop.append(form);
  let current = null; let chosenIcon = null; let nameTouched = false;
  const render = (query = '') => { const term = query.trim().toLowerCase(); const fragment = document.createDocumentFragment(); for (const raw of (_pvIconList || []).filter((x) => String(x).toLowerCase().includes(term)).slice(0, 300)) { const name = String(raw); const tile = document.createElement('button'); tile.type = 'button'; tile.className = `portal-view-icon-tile${name === chosenIcon ? ' selected' : ''}`; tile.title = name; tile.append(icono(name)); tile.addEventListener('click', () => { chosenIcon = name; preview.src = srcIcono(name); render(search.value); picker.hidden = true; }); fragment.append(tile); } grid.replaceChildren(fragment); };
  const close = () => { backdrop.hidden = true; picker.hidden = true; };
  const open = async (item = null) => { current = item; nameTouched = false; url.value = item?.url || ''; label.value = item?.label || ''; chosenIcon = item?.icon || null; preview.src = srcIcono(chosenIcon); search.value = ''; save.textContent = item ? (t('btn.saveChannel') || 'Guardar') : (t('portalView.addFavorite') || 'Agregar favorito'); backdrop.hidden = false; url.focus(); const icons = await cargarIconos(); if (!current && !chosenIcon && icons.length) { chosenIcon = icons[Math.floor(Math.random() * icons.length)]; preview.src = srcIcono(chosenIcon); } render(); };
  url.addEventListener('input', () => { if (nameTouched) return; const host = hostnameDe(url.value); if (host) label.value = host; }); label.addEventListener('input', () => { nameTouched = true; });
  iconButton.addEventListener('click', () => { picker.hidden = !picker.hidden; if (!picker.hidden) search.focus(); }); search.addEventListener('input', () => render(search.value)); cancel.addEventListener('click', close); backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) close(); });
  form.addEventListener('submit', async (e) => { e.preventDefault(); if (!url.value.trim()) { showToast(t('toast.portalFavoriteInvalid'), 'error'); return; } const api = window.electronAPI?.portalView; const result = current ? await api?.editFavorite(current.id, { label: label.value, url: url.value, icon: chosenIcon }) : await api?.addFavorite(label.value, url.value, chosenIcon); if (!result?.ok) { showToast(t('toast.portalFavoriteInvalid'), 'error'); return; } close(); });
  return { backdrop, open, close };
}

export function crearNuevaPestana() {
  const el = document.createElement('div'); el.className = 'portal-view-nueva-pestana'; const list = document.createElement('div'); list.className = 'portal-view-shortcuts-sections'; const modal = crearModal();
  const add = document.createElement('button'); add.type = 'button'; add.className = 'portal-view-fav-trigger'; add.setAttribute('aria-label', t('portalView.addFavorite')); const addIcon = icono(null, 'icon-inline'); addIcon.src = 'icons/add.svg'; add.append(addIcon); add.addEventListener('click', () => modal.open());
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.backdrop.hidden) modal.close(); }); el.append(list, add, modal.backdrop); el._portalFavoriteModal = modal; aplicarTraducciones(el); return el;
}
export function actualizarNuevaPestana(el) {
  const { favorites = [] } = almacenPortalView.getState(); const list = el.querySelector('.portal-view-shortcuts-sections'); const modal = el._portalFavoriteModal; const fragment = document.createDocumentFragment();
  for (const item of favorites) fragment.append(crearTarjeta(item, true, modal.open)); list.replaceChildren(fragment);
}
