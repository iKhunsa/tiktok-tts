import { t, idiomaActual, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { WORD_LISTS, MAX_WORD_LENGTH } from './chat-guard-options.js';
import { visibleWords } from './word-rules.js';

const TAB_ICON = { blocked: 'icons/block.svg', allowed: 'icons/verified_user.svg' };

const tabMarkup = (list) => `
  <button type="button" class="cg-tab" role="tab" id="cgTab-${list}" data-list="${list}" aria-controls="cgWordsPanel">
    <img class="icon-inline" src="${TAB_ICON[list]}" alt=""><span class="cg-tab-label"></span>
  </button>`;

function buildChip(word, list) {
  const item = document.createElement('li');
  item.className = 'cg-chip';
  const label = document.createElement('span');
  label.textContent = word;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'cg-chip-remove';
  remove.dataset.word = word;
  remove.dataset.list = list;
  remove.setAttribute('aria-label', t('chatGuard.words.remove', { word }));
  remove.innerHTML = '<img class="icon-inline" src="icons/close.svg" alt="">';
  item.append(label, remove);
  return item;
}

export function mountWordLists(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgWordsTitle" data-i18n="chatGuard.words.title"></div>
    <div class="cg-tabs" role="tablist" aria-labelledby="cgWordsTitle">${WORD_LISTS.map(tabMarkup).join('')}</div>
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
      <div class="cg-word-tools">
        <input type="file" id="cgWordsImport" accept=".json,.md,.txt,text/plain,application/json" hidden>
        <button type="button" class="cfg-btn small" id="cgWordsImportButton" data-i18n-title="chatGuard.words.import"><img class="icon-inline" src="icons/upload.svg" alt=""><span data-i18n="chatGuard.words.import"></span></button>
        <button type="button" class="cfg-btn small" id="cgWordsExport" data-i18n-title="chatGuard.words.export"><img class="icon-inline" src="icons/download.svg" alt=""><span data-i18n="chatGuard.words.export"></span></button>
        <button type="button" class="cfg-btn small danger" id="cgWordsClear" data-i18n-title="chatGuard.words.clear"><img class="icon-inline" src="icons/delete.svg" alt=""><span data-i18n="chatGuard.words.clear"></span></button>
      </div>
      <div class="cg-confirm" id="cgWordsConfirm" hidden role="alertdialog" aria-modal="false" aria-labelledby="cgWordsConfirmText">
        <span id="cgWordsConfirmText"></span><button type="button" class="cfg-btn small danger" id="cgWordsConfirmYes" data-i18n="chatGuard.words.clear"></button><button type="button" class="cfg-btn small" id="cgWordsConfirmNo" data-i18n="mod.wipeModal.cancel"></button>
      </div>
      <label class="cg-check cg-check-compact"><input type="checkbox" id="cgWordsShare" role="switch"><span><strong data-i18n="chatGuard.words.shareName"></strong><br><span class="cg-hint" data-i18n="chatGuard.words.shareHint"></span></span></label>
      <div class="cg-search">
        <img class="icon-inline" src="icons/search.svg" alt="">
        <label class="cg-sr-only" for="cgWordSearch" data-i18n="chatGuard.words.search"></label>
        <input type="search" id="cgWordSearch" class="cg-input" autocomplete="off" data-i18n-placeholder="chatGuard.words.search">
      </div>
      <ul class="cg-chips"></ul>
      <div class="cg-empty" hidden><img class="icon-inline" src="icons/search_off.svg" alt=""><span></span></div>
      <div class="cg-hint" id="cgWordsTruncated" hidden></div>
    </div>`;
  aplicarTraducciones(container);

  const tabs = [...container.querySelectorAll('.cg-tab')];
  const panel = container.querySelector('#cgWordsPanel');
  const form = container.querySelector('.cg-add');
  const input = container.querySelector('#cgWordInput');
  const search = container.querySelector('#cgWordSearch');
  const problem = container.querySelector('#cgWordProblem');
  const chips = container.querySelector('.cg-chips');
  const empty = container.querySelector('.cg-empty');
  const truncated = container.querySelector('#cgWordsTruncated');
  const importInput = container.querySelector('#cgWordsImport');
  const confirm = container.querySelector('#cgWordsConfirm');
  const confirmYes = container.querySelector('#cgWordsConfirmYes');
  const share = container.querySelector('#cgWordsShare');
  let renderedKey = '';

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
  search.addEventListener('input', () => actions.setQuery(search.value));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (await actions.addWord(currentList(), input.value)) input.value = '';
    input.focus();
  });
  container.querySelector('#cgWordsImportButton').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (file && file.size <= 1024 * 1024 && await actions.importBlockedWords(await file.text())) input.focus();
    importInput.value = '';
  });
  container.querySelector('#cgWordsExport').addEventListener('click', async () => {
    const words = await actions.exportBlockedWords();
    if (!words) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'blocked-words.json' });
    link.click();
    URL.revokeObjectURL(url);
  });
  container.querySelector('#cgWordsClear').addEventListener('click', () => {
    confirm.hidden = false;
    confirm.querySelector('#cgWordsConfirmText').textContent = t('chatGuard.words.clearConfirm', { n: store.getState().words.blocked.length });
    confirmYes.focus();
  });
  confirmYes.addEventListener('click', async () => { if (await actions.clearBlockedWords()) confirm.hidden = true; input.focus(); });
  container.querySelector('#cgWordsConfirmNo').addEventListener('click', () => { confirm.hidden = true; input.focus(); });
  confirm.addEventListener('keydown', (event) => { if (event.key === 'Escape') { confirm.hidden = true; input.focus(); } });
  share.addEventListener('change', () => actions.saveConfig({ blockedWordsTelemetryEnabled: share.checked }));

  chips.addEventListener('click', async (event) => {
    const remove = event.target.closest('.cg-chip-remove');
    if (!remove) return;
    const index = [...chips.children].indexOf(remove.parentElement);
    if (!(await actions.removeWord(remove.dataset.list, remove.dataset.word))) return;
    const buttons = chips.querySelectorAll('.cg-chip-remove');
    (buttons[Math.min(index, buttons.length - 1)] || input).focus();
  });

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

  function renderChips(state) {
    const words = state.words[state.tab];
    // El idioma entra en la clave: al cambiarlo hay que redibujar (aria-label traducido).
    const key = `${idiomaActual()}|${state.tab}|${state.query}|${words.join('\n')}`;
    if (key === renderedKey) return;
    renderedKey = key;
    const { items, total, truncated: cut } = visibleWords(words, state.query);
    chips.replaceChildren(...items.map((word) => buildChip(word, state.tab)));
    const emptyKey = words.length === 0 ? `chatGuard.words.empty${state.tab === 'blocked' ? 'Blocked' : 'Allowed'}` : 'chatGuard.words.noResults';
    empty.hidden = items.length > 0;
    empty.querySelector('span').textContent = t(emptyKey);
    truncated.hidden = !cut;
    truncated.textContent = cut ? t('chatGuard.words.truncated', { shown: items.length, total }) : '';
  }

  function render(state) {
    const disabled = state.phase !== 'ready';
    container.setAttribute('aria-busy', String(state.phase === 'loading'));
    [input, search, form.querySelector('button')].forEach((control) => { control.disabled = disabled; });
    renderTabs(state);
    renderProblem(state);
    renderChips(state);
    if (search.value !== state.query) search.value = state.query;
    share.checked = state.status?.blockedWordsTelemetryEnabled === true;
  }

  render(store.getState());
  return store.subscribe(render);
}
