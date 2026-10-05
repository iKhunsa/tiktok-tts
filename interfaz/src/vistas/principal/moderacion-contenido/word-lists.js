import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { openModerationPopup } from '../moderacion-popup/index.js';
import { WORD_LISTS, MAX_WORD_LENGTH } from './chat-guard-options.js';

const TAB_ICON = { blocked: 'icons/block.svg', allowed: 'icons/verified_user.svg' };
const tabMarkup = (list) => `
  <button type="button" class="cg-tab" role="tab" id="cgTab-${list}" data-list="${list}" aria-controls="cgWordsPanel">
    <img class="icon-inline" src="${TAB_ICON[list]}" alt=""><span class="cg-tab-label"></span>
  </button>`;

export function mountWordLists(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgWordsTitle" data-i18n="chatGuard.words.title"></div>
    <div class="cg-tabs-row">
      <div class="cg-tabs" role="tablist" aria-labelledby="cgWordsTitle">${WORD_LISTS.map(tabMarkup).join('')}</div>
      <button type="button" class="cfg-btn small" id="cgWordsExport" data-i18n-title="chatGuard.words.export"><img class="icon-inline" src="icons/download.svg" alt=""><span data-i18n="chatGuard.words.export"></span></button>
    </div>
    <div class="cg-words-panel" id="cgWordsPanel" role="tabpanel">
      <div class="cg-hint" id="cgWordsHelp"></div>
      <div class="cg-hint" id="cgWordsNote" data-i18n="chatGuard.words.allowedSingleWord"></div>
      <form class="cg-add" novalidate>
        <label class="cg-sr-only" for="cgWordInput" data-i18n="chatGuard.words.inputLabel"></label>
        <input type="text" id="cgWordInput" class="cg-input" maxlength="${MAX_WORD_LENGTH}" autocomplete="off"
          aria-describedby="cgWordProblem" data-i18n-placeholder="chatGuard.words.inputPlaceholder">
        <button type="submit" class="cfg-btn cg-add-btn"><img class="icon-inline" src="icons/add.svg" alt=""><span data-i18n="chatGuard.words.add"></span></button>
      </form>
      <div class="cg-problem" id="cgWordProblem" role="alert" hidden></div>
      <button type="button" class="cfg-btn small" id="cgWordsViewAll" data-i18n="chatGuard.words.viewAll"></button>
    </div>`;
  aplicarTraducciones(container);

  const tabs = [...container.querySelectorAll('.cg-tab')];
  const panel = container.querySelector('#cgWordsPanel');
  const form = container.querySelector('.cg-add');
  const input = container.querySelector('#cgWordInput');
  const problem = container.querySelector('#cgWordProblem');

  const currentList = () => store.getState().tab;

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => actions.setTab(tab.dataset.list));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = tabs[(index + step + tabs.length) % tabs.length];
      actions.setTab(next.dataset.list);
      next.focus();
    });
  });

  input.addEventListener('input', () => actions.clearWordProblem());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (await actions.addWord(currentList(), input.value)) input.value = '';
    input.focus();
  });
  container.querySelector('#cgWordsExport').addEventListener('click', async () => {
    const words = await actions.exportWords(currentList());
    if (!words) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `${currentList()}-words.json` });
    link.click();
    URL.revokeObjectURL(url);
  });
  container.querySelector('#cgWordsViewAll').addEventListener('click', () => openModerationPopup('words'));

  function renderTabs(state) {
    for (const tab of tabs) {
      const list = tab.dataset.list;
      const selected = list === state.tab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.querySelector('.cg-tab-label').textContent = t(`chatGuard.words.${list}Tab`, { n: state.words[list].length });
    }
    panel.setAttribute('aria-labelledby', `cgTab-${state.tab}`);
    container.querySelector('#cgWordsHelp').textContent = t(`chatGuard.words.${state.tab}Help`);
    container.querySelector('#cgWordsNote').hidden = state.tab !== 'allowed';
  }

  function renderProblem(state) {
    const found = state.wordProblem;
    problem.hidden = !found;
    problem.textContent = found ? t(found.key, found.otherListKey ? { other: t(found.otherListKey) } : undefined) : '';
    input.setAttribute('aria-invalid', String(Boolean(found)));
  }

  function render(state) {
    const disabled = state.phase !== 'ready';
    container.setAttribute('aria-busy', String(state.phase === 'loading'));
    [input, form.querySelector('button')].forEach((control) => { control.disabled = disabled; });
    renderTabs(state);
    renderProblem(state);
    container.querySelector('#cgWordsViewAll').disabled = disabled;
  }

  render(store.getState());
  return store.subscribe(render);
}
