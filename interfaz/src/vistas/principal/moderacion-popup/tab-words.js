import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { chatGuardApi } from '../moderacion-contenido/chat-guard-api.js';
import { refreshModeracionStatus } from '../moderacion-contenido/index.js';

function mountWordsTab(panel, list) {
  const inputId = list === 'blocked' ? 'mpBlockedWordSearch' : 'mpAllowedWordSearch';
  panel.innerHTML = `
    <div class="mp-toolbar">
      <label class="mp-sr-only" for="${inputId}" data-i18n="modPopup.words.search"></label>
      <input type="search" id="${inputId}" class="mp-input" autocomplete="off" data-i18n-placeholder="modPopup.words.search">
    </div>
    <div class="mp-summary" aria-live="polite"></div>
    <ul class="mp-chips"></ul>
    <div class="mp-empty" hidden></div>
    ${list === 'blocked' ? '<p class="mp-hint" data-i18n="modPopup.words.dictionaryNote"></p>' : ''}`;
  aplicarTraducciones(panel);
  const input = panel.querySelector(`#${inputId}`);
  const summary = panel.querySelector('.mp-summary');
  const chips = panel.querySelector('.mp-chips');
  const empty = panel.querySelector('.mp-empty');
  let words = [];
  let failed = false;

  function buildChip(word) {
    const chip = document.createElement('li');
    chip.className = 'mp-chip';
    const label = document.createElement('span');
    label.textContent = word;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'mp-chip-remove';
    remove.dataset.list = list;
    remove.dataset.word = word;
    remove.setAttribute('aria-label', t('chatGuard.words.remove', { word }));
    remove.innerHTML = '<img class="icon-inline" src="icons/close.svg" alt="">';
    chip.append(label, remove);
    return chip;
  }

  function render() {
    const needle = input.value.trim().toLowerCase();
    const shown = words.filter((word) => word.toLowerCase().includes(needle));
    summary.textContent = failed ? '' : t('modPopup.words.count', { n: words.length });
    chips.replaceChildren(...shown.map(buildChip));
    empty.hidden = shown.length > 0;
    if (failed) empty.textContent = t('modPopup.words.error');
    else empty.textContent = t(words.length ? 'modPopup.words.emptySearch' : `chatGuard.words.empty${list === 'blocked' ? 'Blocked' : 'Allowed'}`);
  }

  async function refresh() {
    const result = await (list === 'blocked' ? chatGuardApi.getBlockedWords() : chatGuardApi.getStatus());
    failed = !result.ok;
    const loaded = list === 'blocked' ? result.data.words : result.data.allowedWords;
    words = result.ok && Array.isArray(loaded) ? loaded : [];
    render();
  }

  input.addEventListener('input', render);
  chips.addEventListener('click', async (event) => {
    const remove = event.target.closest('.mp-chip-remove');
    if (!remove) return;
    remove.disabled = true;
    const result = await (remove.dataset.list === 'blocked'
      ? chatGuardApi.removeBlockedWord(remove.dataset.word)
      : chatGuardApi.removeAllowedWord(remove.dataset.word));
    if (!result.ok) {
      failed = true;
      render();
      return;
    }
    // Las permitidas no tienen evento WS: el contador de Ajustes se refresca aqui.
    refreshModeracionStatus();
    await refresh();
  });
  render();
  refresh();
  return { refresh };
}

export const mountBlockedWordsTab = (panel) => mountWordsTab(panel, 'blocked');
export const mountAllowedWordsTab = (panel) => mountWordsTab(panel, 'allowed');
