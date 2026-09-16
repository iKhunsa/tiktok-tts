import { almacenPortalView } from './estado.js';
import { showToast } from '../../../componentes/toast.js';
import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

function handleShortcutClick(url) {
  const { activeTabId } = almacenPortalView.getState();
  if (!activeTabId) return;
  window.electronAPI?.portalView?.navigate(activeTabId, url);
}

function handleRemoveFavorite(e, id) {
  e.stopPropagation();
  window.electronAPI?.portalView?.removeFavorite(id);
}

function handleAddFavorite(form) {
  const labelInput = form.querySelector('.portal-view-fav-label');
  const urlInput = form.querySelector('.portal-view-fav-url');
  window.electronAPI?.portalView?.addFavorite(labelInput.value, urlInput.value).then((res) => {
    if (!res?.ok) { showToast(t('toast.portalFavoriteInvalid'), 'error'); return; }
    labelInput.value = '';
    urlInput.value = '';
  });
}

// item.label/item.url son datos del usuario (favoritos) o constantes propias
// (predefined) — siempre textContent, nunca innerHTML, por las dudas.
function crearTarjeta(item, { removable }) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'portal-view-shortcut';
  card.title = item.url;
  card.addEventListener('click', () => handleShortcutClick(item.url));

  const label = document.createElement('span');
  label.className = 'portal-view-shortcut-label';
  label.textContent = item.label;
  card.appendChild(label);

  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'portal-view-shortcut-remove';
    removeBtn.setAttribute('data-i18n-title', 'portalView.removeFavorite');
    removeBtn.innerHTML = '<img class="icon-inline" src="icons/close.svg" alt="">';
    removeBtn.addEventListener('click', (e) => handleRemoveFavorite(e, item.id));
    card.appendChild(removeBtn);
  }

  return card;
}

function crearSeccion(titleKey, items, { removable }) {
  const section = document.createElement('div');
  section.className = 'portal-view-shortcuts-section';

  const heading = document.createElement('h3');
  heading.setAttribute('data-i18n', titleKey);
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'portal-view-shortcuts-grid';
  for (const item of items) grid.appendChild(crearTarjeta(item, { removable }));
  section.appendChild(grid);

  return section;
}

// El formulario se crea UNA sola vez y nunca se destruye — actualizarNuevaPestana()
// se llama tras cualquier cambio de estado de PortalView (incluye eventos de
// pestañas en segundo plano, título/loading), no solo al agregar/quitar un
// favorito. Si el formulario se reconstruyera en cada llamada (como las
// secciones de abajo, que no tienen estado propio), un evento de fondo podía
// borrar lo que el usuario estaba escribiendo antes de enviarlo.
function crearFormularioFavorito() {
  const form = document.createElement('form');
  form.className = 'portal-view-fav-form';
  form.innerHTML = `
    <input type="text" class="portal-view-fav-label" maxlength="60"
      data-i18n-placeholder="portalView.favoriteLabelPlaceholder" placeholder="Nombre">
    <input type="text" class="portal-view-fav-url"
      data-i18n-placeholder="portalView.favoriteUrlPlaceholder" placeholder="URL">
    <button type="submit" class="icon-btn" data-i18n-title="portalView.addFavorite" title="Agregar favorito">
      <img class="icon-inline" src="icons/add.svg" alt="">
    </button>
  `;
  form.addEventListener('submit', (e) => { e.preventDefault(); handleAddFavorite(form); });
  return form;
}

export function crearNuevaPestana() {
  const el = document.createElement('div');
  el.className = 'portal-view-nueva-pestana';

  const sections = document.createElement('div');
  sections.className = 'portal-view-shortcuts-sections';
  el.appendChild(sections);
  el.appendChild(crearFormularioFavorito());

  aplicarTraducciones(el);
  return el;
}

// Reconstruye solo las secciones de tarjetas (sin estado propio, a lo sumo
// unas pocas docenas — diffear no compra nada acá, mismo criterio que
// tab-bar.js) — nunca toca el formulario, ver comentario arriba.
export function actualizarNuevaPestana(el) {
  const { favorites, predefined } = almacenPortalView.getState();
  const sections = el.querySelector('.portal-view-shortcuts-sections');
  sections.innerHTML = '';

  if (predefined.length) sections.appendChild(crearSeccion('portalView.shortcuts', predefined, { removable: false }));
  sections.appendChild(crearSeccion('portalView.favorites', favorites, { removable: true }));

  aplicarTraducciones(sections);
}
