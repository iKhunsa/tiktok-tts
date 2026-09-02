import { cargarLocaleOverlay, t, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const maxRows = intParam(params, 'rows', 10);

const RANK_SYMBOLS = {
  1: '<img class="icon-inline" src="icons/emoji_events.svg" alt="">',
  2: '<img class="icon-inline" src="icons/emoji_events.svg" alt="">',
  3: '<img class="icon-inline" src="icons/emoji_events.svg" alt="">',
};

let likersMap = new Map();
let reduceMotion = false;

function getSorted() {
  return [...likersMap.values()].sort((a, b) => b.totalLikes - a.totalLikes).slice(0, maxRows);
}

function renderLeaderboard(animate) {
  const board = document.getElementById('leaderboard');
  const sorted = getSorted();

  if (sorted.length === 0) {
    board.innerHTML = `<div class="empty-msg">${t('overlayStr.waitingLikes')}</div>`;
    return;
  }

  const oldPos = new Map();
  if (animate && !reduceMotion) {
    board.querySelectorAll('.row[data-user]').forEach((el) => {
      oldPos.set(el.dataset.user, el.getBoundingClientRect().top);
    });
  }

  board.innerHTML = '';
  sorted.forEach((entry, i) => {
    const rank = i + 1;
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.user = entry.user;

    const rankEl = document.createElement('span');
    rankEl.className = 'rank' + (rank <= 3 ? ' rank-' + rank : '');
    rankEl.innerHTML = RANK_SYMBOLS[rank] || rank;

    const nameEl = document.createElement('span');
    nameEl.className = 'username';
    nameEl.textContent = '@' + entry.user;

    const likeEl = document.createElement('span');
    likeEl.className = 'likes';
    likeEl.innerHTML = '<img class="icon-inline" src="icons/favorite.svg" alt=""> ' + entry.totalLikes.toLocaleString(idiomaOverlay());

    row.appendChild(rankEl);
    row.appendChild(nameEl);
    row.appendChild(likeEl);
    board.appendChild(row);
  });

  if (animate && !reduceMotion) {
    board.querySelectorAll('.row[data-user]').forEach((el) => {
      const old = oldPos.get(el.dataset.user);
      if (old === undefined) return;
      const delta = old - el.getBoundingClientRect().top;
      if (Math.abs(delta) > 2) {
        el.style.transform = `translateY(${delta}px)`;
        el.style.transition = 'none';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
            el.style.transform = '';
          });
        });
      }
    });
  }
}

fetch('/api/overlay-stats')
  .then((r) => r.json())
  .then((d) => {
    for (const entry of d.topLikers || []) likersMap.set(entry.user, entry);
    renderLeaderboard(false);
  })
  .catch(() => {});

function alManejarMensaje(d) {
  if (d.type === 'like') {
    const key = d.user;
    const existing = likersMap.get(key) || { user: key, totalLikes: 0 };
    existing.totalLikes += d.likeCount;
    likersMap.set(key, existing);
    renderLeaderboard(true);
  }
  if (d.type === 'connected' && d.isFirst) {
    likersMap.clear();
    renderLeaderboard(false);
  }
  if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

const aplicarA11y = iniciarAccesibilidadOverlay((rm) => { reduceMotion = rm; });

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
