import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';

registrarErroresOverlay();

const MAX_ENTRIES = 10;
const params = leerParametros();
aplicarParametrosVisuales(params);
if (params.get('layout') === 'rows') document.body.classList.add('layout-rows');

const listFollows = document.getElementById('list-follows');
const listShares = document.getElementById('list-shares');
const countFollows = document.getElementById('count-follows');
const countShares = document.getElementById('count-shares');

let totals = { follows: 0, shares: 0 };

function addEntry(listEl, user, prepend = true) {
  const empty = listEl.querySelector('.empty');
  if (empty) empty.remove();

  const initials = user.substring(0, 2).toUpperCase();
  const div = document.createElement('div');
  div.className = 'entry';
  div.innerHTML = `
    <div class="entry-avatar">${escaparHtml(initials)}</div>
    <span class="entry-name">@${escaparHtml(user)}</span>
  `;

  if (prepend) listEl.insertBefore(div, listEl.firstChild);
  else listEl.appendChild(div);

  while (listEl.children.length > MAX_ENTRIES) listEl.removeChild(listEl.lastChild);
}

function reverseList(el) {
  const children = Array.from(el.children).filter((c) => !c.classList.contains('empty'));
  children.reverse().forEach((c) => el.appendChild(c));
}

fetch('/api/overlay-stats')
  .then((r) => r.json())
  .then((d) => {
    const c = d.credits || {};
    const follows = (c.followers || []).slice(-MAX_ENTRIES);
    const shares = (c.sharers || []).slice(-MAX_ENTRIES);
    totals.follows = follows.length;
    totals.shares = shares.length;
    follows.forEach((f) => addEntry(listFollows, f.user, false));
    shares.forEach((s) => addEntry(listShares, s.user, false));
    reverseList(listFollows);
    reverseList(listShares);
    countFollows.textContent = totals.follows;
    countShares.textContent = totals.shares;
  })
  .catch(() => {});

function alManejarMensaje(d) {
  if (d.type === 'follow') {
    totals.follows++;
    countFollows.textContent = totals.follows;
    addEntry(listFollows, d.user);
  } else if (d.type === 'share') {
    totals.shares++;
    countShares.textContent = totals.shares;
    addEntry(listShares, d.user);
  } else if (d.type === 'connected' && d.isFirst) {
    totals = { follows: 0, shares: 0 };
    countFollows.textContent = 0;
    countShares.textContent = 0;
    listFollows.innerHTML = `<div class="empty">${t('overlayStr.noFollowers')}</div>`;
    listShares.innerHTML = `<div class="empty">${t('overlayStr.noShared')}</div>`;
  } else if (d.type === 'config-updated') {
    aplicarA11y(d.config || {});
  }
}

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
