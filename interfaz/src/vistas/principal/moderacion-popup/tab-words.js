import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { chatGuardApi } from '../moderacion-contenido/chat-guard-api.js';

export function mountWordsTab(panel) {
  panel.innerHTML = `
    <p class="mp-hint" data-i18n="modPopup.words.intro"></p>
    <div class="mp-toolbar">
      <label class="mp-sr-only" for="mpWordSearch" data-i18n="modPopup.words.search"></label>
      <input type="search" id="mpWordSearch" class="mp-input" autocomplete="off" data-i18n-placeholder="modPopup.words.search">
    </div>
    <div class="mp-summary" aria-live="polite"></div>
    <ul class="mp-chips"></ul>
    <div class="mp-empty" hidden></div>
    <p class="mp-hint" data-i18n="modPopup.words.dictionaryNote"></p>`;
  aplicarTraducciones(panel);
  const input = panel.querySelector('#mpWordSearch');
  const chips = panel.querySelector('.mp-chips');
  const empty = panel.querySelector('.mp-empty');
  const summary = panel.querySelector('.mp-summary');
  let words = [];
  let failed = false;

  function render() {
    const needle = input.value.trim().toLowerCase();
    const shown = words.filter((word) => word.toLowerCase().includes(needle));
    summary.textContent = failed ? '' : t('modPopup.words.count', { n: words.length });
    chips.replaceChildren(...shown.map((word) => {
      const chip = document.createElement('li');
      chip.className = 'mp-chip';
      chip.textContent = word;
      return chip;
    }));
    empty.hidden = shown.length > 0;
    if (failed) empty.textContent = t('modPopup.words.error');
    else empty.textContent = t(words.length ? 'modPopup.words.emptySearch' : 'modPopup.words.empty');
  }

  async function refresh() {
    const result = await chatGuardApi.getBlockedWords();
    failed = !result.ok;
    words = result.ok && Array.isArray(result.data.words) ? result.data.words : [];
    render();
  }

  input.addEventListener('input', render);
  render();
  refresh();
  return { refresh };
}
