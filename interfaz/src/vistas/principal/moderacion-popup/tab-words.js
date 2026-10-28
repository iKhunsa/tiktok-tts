import { t, tErr, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { chatGuardApi } from '../moderacion-contenido/chat-guard-api.js';
import { refreshModeracionStatus } from '../moderacion-contenido/index.js';
import { openImportModal } from '../moderacion-contenido/import-modal.js';
import { descargarPalabras } from '../moderacion-contenido/descargar-palabras.js';

// El buscador tambien sirve para agregar: lo escrito se agrega con Enter o con el boton.
function mountWordsTab(panel, list) {
  const inputId = list === 'blocked' ? 'mpBlockedWordSearch' : 'mpAllowedWordSearch';
  panel.innerHTML = `
    <form class="mp-toolbar" novalidate>
      <label class="mp-buscar">
        <img src="icons/search.svg" alt="">
        <span class="mp-sr-only" data-i18n="modPopup.words.search"></span>
        <input type="search" id="${inputId}" class="mp-input" autocomplete="off" data-i18n-placeholder="modPopup.words.search">
      </label>
      <button type="submit" class="btn-supabase-primary mp-add"><img class="icon-inline" src="icons/add.svg" alt=""> <span data-i18n="chatGuard.words.add"></span></button>
    </form>
    <div class="mp-tabla">
      <div class="mp-tabla-head" aria-hidden="true"><span data-i18n="modPopup.words.colWord"></span><span data-i18n="modPopup.words.colActions"></span></div>
      <ul class="mp-filas"></ul>
      <div class="mp-empty" hidden></div>
    </div>
    ${list === 'blocked' ? '<p class="mp-hint" data-i18n="modPopup.words.dictionaryNote"></p>' : ''}
    <div class="mp-pie">
      <span class="mp-summary" aria-live="polite"></span>
      <div class="mp-pie-acciones">
        ${list === 'blocked' ? '<button type="button" class="cfg-btn mp-importar"><img class="icon-inline" src="icons/upload.svg" alt=""> <span data-i18n="chatGuard.words.import"></span></button>' : ''}
        <button type="button" class="cfg-btn mp-exportar"><img class="icon-inline" src="icons/download.svg" alt=""> <span data-i18n="chatGuard.words.export"></span></button>
      </div>
      <label class="mp-orden"><span data-i18n="modPopup.words.sort"></span>
        <select>
          <option value="asc" data-i18n="modPopup.words.sortAz"></option>
          <option value="desc" data-i18n="modPopup.words.sortZa"></option>
        </select>
      </label>
    </div>`;
  aplicarTraducciones(panel);
  const form = panel.querySelector('.mp-toolbar');
  const input = panel.querySelector(`#${inputId}`);
  const summary = panel.querySelector('.mp-summary');
  const rows = panel.querySelector('.mp-filas');
  const empty = panel.querySelector('.mp-empty');
  const order = panel.querySelector('.mp-orden select');
  let words = [];
  let failed = false;

  function buildRow(word) {
    const row = document.createElement('li');
    row.className = 'mp-fila';
    const label = document.createElement('span');
    label.textContent = word;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'mp-quitar';
    remove.dataset.word = word;
    remove.setAttribute('aria-label', t('chatGuard.words.remove', { word }));
    remove.title = t('chatGuard.words.remove', { word });
    remove.innerHTML = '<img class="icon-inline" src="icons/delete.svg" alt="">';
    row.append(label, remove);
    return row;
  }

  function render() {
    const needle = input.value.trim().toLowerCase();
    const sign = order.value === 'desc' ? -1 : 1;
    const shown = words
      .filter((word) => word.toLowerCase().includes(needle))
      .sort((a, b) => sign * a.localeCompare(b, undefined, { sensitivity: 'base' }));
    summary.textContent = failed ? '' : t('modPopup.words.count', { n: words.length });
    rows.replaceChildren(...shown.map(buildRow));
    empty.hidden = shown.length > 0;
    if (failed) empty.textContent = t('modPopup.words.error');
    else if (!words.length && !needle) empty.textContent = t(`chatGuard.words.empty${list === 'blocked' ? 'Blocked' : 'Allowed'}`);
    else empty.textContent = t('modPopup.words.addHint', { word: input.value.trim() });
  }

  async function refresh() {
    const result = await (list === 'blocked' ? chatGuardApi.getBlockedWords() : chatGuardApi.getStatus());
    failed = !result.ok;
    const loaded = list === 'blocked' ? result.data.words : result.data.allowedWords;
    words = result.ok && Array.isArray(loaded) ? loaded : [];
    render();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const word = input.value.trim();
    if (!word) return input.focus();
    const result = await (list === 'blocked' ? chatGuardApi.addBlockedWord(word) : chatGuardApi.addAllowedWord(word));
    if (!result.ok) return showToast(tErr({ errorKey: result.errorKey }, 'chatGuard.toast.saveError'), 'error');
    input.value = '';
    refreshModeracionStatus();
    await refresh();
    input.focus();
  });
  // Importar solo existe para bloqueadas (el modal y la API son de esa lista).
  panel.querySelector('.mp-importar')?.addEventListener('click', () => openImportModal({
    existing: words,
    importar: async (content) => {
      const before = words.length;
      const result = await chatGuardApi.importBlockedWords(content);
      if (!result.ok) {
        showToast(tErr({ errorKey: result.errorKey }, 'chatGuard.toast.saveError'), 'error');
        return false;
      }
      refreshModeracionStatus();
      await refresh();
      showToast(t('chatGuard.words.imported', { n: words.length - before }), 'success');
      return true;
    },
  }));
  panel.querySelector('.mp-exportar').addEventListener('click', async () => {
    if (list === 'allowed') return descargarPalabras(list, words);
    const result = await chatGuardApi.exportBlockedWords();
    if (!result.ok || !Array.isArray(result.data)) return showToast(tErr({ errorKey: result.errorKey }, 'chatGuard.toast.saveError'), 'error');
    descargarPalabras(list, result.data);
  });
  input.addEventListener('input', render);
  order.addEventListener('change', render);
  rows.addEventListener('click', async (event) => {
    const remove = event.target.closest('.mp-quitar');
    if (!remove) return;
    remove.disabled = true;
    const result = await (list === 'blocked'
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
