import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { moderationSession } from '../../../nucleo/estado/moderacion-sesion.js';
import { updateQueueBadge } from '../../../nucleo/tts/cola-tts.js';
import { atraparFoco } from '../../../componentes/atrapar-foco.js';
import { mountBlockedTab } from './tab-blocked.js';
import { mountAllowedWordsTab, mountBlockedWordsTab } from './tab-words.js';
import { mountQueueTab } from './tab-queue.js';

const TABS = [
  { id: 'blocked', icon: 'icons/block.svg', mount: mountBlockedTab },
  { id: 'words', icon: 'icons/search.svg', mount: mountBlockedWordsTab },
  { id: 'allowedWords', icon: 'icons/verified_user.svg', mount: mountAllowedWordsTab },
  { id: 'queue', icon: 'icons/queue.svg', mount: mountQueueTab },
];

const TAB_TITLE_KEY = {
  words: 'modPopup.tab.words',
  allowedWords: 'modPopup.tab.allowedWords',
};

let overlay = null;
const views = {};
let releaseFocus = null;
let unsubscribe = null;
let opener = null;

function build() {
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay mp-overlay';
  overlay.innerHTML = `
    <div class="modal-content mp-dialog" role="dialog" aria-modal="true" aria-labelledby="mpTitle">
      <button type="button" class="modal-close" data-i18n-aria-label="modPopup.close"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="mpTitle" data-i18n="modPopup.title"></h2>
      <div class="mp-tabs" role="tablist" data-i18n-aria-label="modPopup.title">
        ${TABS.map((tab) => `<button type="button" class="mp-tab" role="tab" id="mpTab-${tab.id}" data-tab="${tab.id}" aria-controls="mpPanel-${tab.id}"><img class="icon-inline" src="${tab.icon}" alt=""><span data-i18n="modPopup.tab.${tab.id}"></span></button>`).join('')}
      </div>
      ${TABS.map((tab) => `<div class="mp-panel" role="tabpanel" id="mpPanel-${tab.id}" aria-labelledby="mpTab-${tab.id}" hidden></div>`).join('')}
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);
  TABS.forEach((tab) => { views[tab.id] = tab.mount(overlay.querySelector(`#mpPanel-${tab.id}`)); });

  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModerationPopup(); });
  overlay.querySelector('.modal-close').addEventListener('click', closeModerationPopup);
  const tablist = overlay.querySelector('[role="tablist"]');
  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) selectTab(tab.dataset.tab);
  });
  tablist.addEventListener('keydown', onTabKey);
}

function onTabKey(event) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!step) return;
  const current = overlay.querySelector('.mp-tab[aria-selected="true"]').dataset.tab;
  const index = TABS.findIndex((tab) => tab.id === current);
  const next = TABS[(index + step + TABS.length) % TABS.length].id;
  selectTab(next);
  overlay.querySelector(`#mpTab-${next}`).focus();
  event.preventDefault();
}

function selectTab(id) {
  overlay.querySelector('#mpTitle').textContent = t(TAB_TITLE_KEY[id] || 'modPopup.title');
  TABS.forEach((tab) => {
    const active = tab.id === id;
    const button = overlay.querySelector(`#mpTab-${tab.id}`);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    overlay.querySelector(`#mpPanel-${tab.id}`).hidden = !active;
  });
  views[id].refresh();
}

export function openModerationPopup(tabId = 'blocked') {
  if (!overlay) build();
  opener = document.activeElement;
  selectTab(TABS.some((tab) => tab.id === tabId) ? tabId : 'blocked');
  overlay.classList.add('show');
  releaseFocus = atraparFoco(overlay, closeModerationPopup);
  unsubscribe = moderationSession.subscribe(() => {
    views.blocked.refresh();
    updateQueueBadge();
  });
  overlay.querySelector('.mp-tab[aria-selected="true"]').focus();
}

export function closeModerationPopup() {
  if (!overlay || !overlay.classList.contains('show')) return;
  overlay.classList.remove('show');
  releaseFocus();
  unsubscribe();
  releaseFocus = null;
  unsubscribe = null;
  if (opener && opener.focus) opener.focus();
}

// Los enlaces del badge (#queueBadge) se repintan en cada cambio: delegacion.
export function initModerationPopup() {
  document.getElementById('queueBadge')?.addEventListener('click', (event) => {
    const link = event.target.closest('[data-popup-tab]');
    if (link) openModerationPopup(link.dataset.popupTab);
  });
}
