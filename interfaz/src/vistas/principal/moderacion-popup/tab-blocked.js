import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { moderationSession } from '../../../nucleo/estado/moderacion-sesion.js';
import { filterEntries } from './filter-entries.js';
import { reasonLabel, originLabel } from './labels.js';

const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function buildRow(entry) {
  const item = document.createElement('li');
  item.className = `mp-row mp-row--${entry.accion}`;
  const meta = document.createElement('div');
  meta.className = 'mp-row-meta';
  const when = document.createElement('time');
  when.textContent = formatTime(entry.timestamp);
  const platform = document.createElement('span');
  platform.className = 'mp-platform';
  platform.textContent = String(entry.platform).toUpperCase();
  const user = document.createElement('strong');
  user.textContent = entry.nick || t('modPopup.blocked.unknownUser');
  const action = document.createElement('span');
  action.className = 'mp-action';
  action.textContent = t(`modPopup.action.${entry.accion}`);
  meta.append(when, platform, user, action);

  const text = document.createElement('p');
  text.className = 'mp-row-text';
  text.textContent = entry.text;

  const why = document.createElement('div');
  why.className = 'mp-row-why';
  why.textContent = t('modPopup.blocked.why', { reason: reasonLabel(entry), origin: originLabel(entry.origen) });
  item.append(meta, text, why);
  return item;
}

export function mountBlockedTab(panel) {
  panel.innerHTML = `
    <p class="mp-hint" data-i18n="modPopup.blocked.intro"></p>
    <div class="mp-toolbar">
      <label class="mp-sr-only" for="mpFilter" data-i18n="modPopup.blocked.filter"></label>
      <input type="search" id="mpFilter" class="mp-input" autocomplete="off" data-i18n-placeholder="modPopup.blocked.filter">
      <button type="button" class="cfg-btn mp-clear"><img class="icon-inline" src="icons/delete.svg" alt=""><span data-i18n="modPopup.blocked.clear"></span></button>
    </div>
    <div class="mp-summary" aria-live="polite"></div>
    <ul class="mp-list"></ul>
    <div class="mp-empty" hidden></div>`;
  aplicarTraducciones(panel);
  const input = panel.querySelector('#mpFilter');
  const list = panel.querySelector('.mp-list');
  const empty = panel.querySelector('.mp-empty');
  const summary = panel.querySelector('.mp-summary');

  function render() {
    const all = moderationSession.list();
    const rows = filterEntries(all, input.value).reverse();
    const counts = moderationSession.counts();
    summary.textContent = t('modPopup.blocked.summary', { blocked: counts.blocked, shadow: counts.shadow });
    list.replaceChildren(...rows.map(buildRow));
    empty.hidden = rows.length > 0;
    empty.textContent = t(all.length ? 'modPopup.blocked.emptyFilter' : 'modPopup.blocked.empty');
  }

  input.addEventListener('input', render);
  panel.querySelector('.mp-clear').addEventListener('click', () => moderationSession.clear());
  render();
  return { refresh: render };
}
