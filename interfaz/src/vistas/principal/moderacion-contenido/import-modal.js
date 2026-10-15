import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { normalizeWord } from './word-rules.js';

const EXAMPLE = '[\n  "palabra1",\n  "palabra2",\n  "frase corta"\n]';
const STEPS = ['importStepFormat', 'importStepFile', 'importStepConfirm'];
const PREVIEW_MAX = 12;
const isJsonFile = (file) => /\.json$/i.test(file.name);

// Mismo criterio que el servidor (routes/blocked-words-import.js): lista JSON de textos.
// Devuelve las palabras normalizadas o null si el formato no vale.
function parseWordList(content) {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return null;
    return [...new Set(parsed.map(normalizeWord).filter(Boolean))];
  } catch {
    return null;
  }
}

const stepperMarkup = () => STEPS.map((key, i) => `
  <li class="cg-imp-step" data-step="${i}">
    <span class="cg-imp-step-num" aria-hidden="true"><span class="cg-imp-step-digit">${i + 1}</span><span class="cg-imp-ico cg-imp-ico-check"></span></span>
    <span class="cg-imp-step-label">${esc(t(`chatGuard.words.${key}`))}</span>
  </li>`).join('');

// Popup de importar palabras bloqueadas en 3 pasos: formato -> archivo -> confirmar.
// existing = palabras ya bloqueadas (para contar las nuevas); importar(content) -> true si se guardo.
export function openImportModal({ existing, importar }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content cg-imp" role="dialog" aria-modal="true" aria-labelledby="cgImpTitle">
      <button class="modal-close" type="button" data-cancel aria-label="${esc(t('chatGuard.words.importCancel'))}"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="cgImpTitle" class="cg-imp-title">${esc(t('chatGuard.words.importTitle'))}</h2>
      <ol class="cg-imp-steps">${stepperMarkup()}</ol>

      <section class="cg-imp-panel" data-panel="0">
        <p class="cg-imp-lead">${esc(t('chatGuard.words.importIntro'))}</p>
        <h3 class="cg-imp-heading">${esc(t('chatGuard.words.importFormatTitle'))}</h3>
        <div class="cg-imp-code">
          <pre><code>${esc(EXAMPLE)}</code></pre>
          <button type="button" class="cg-imp-copy" data-copy aria-label="${esc(t('chatGuard.words.importCopy'))}" title="${esc(t('chatGuard.words.importCopy'))}">
            <span class="cg-imp-ico cg-imp-ico-copy"></span>
          </button>
        </div>
        <p class="cg-imp-note"><span class="cg-imp-ico cg-imp-ico-info"></span><span>${esc(t('chatGuard.words.importFormatNote'))}</span></p>
      </section>

      <section class="cg-imp-panel" data-panel="1" hidden>
        <label class="cg-imp-drop" tabindex="0">
          <span class="cg-imp-drop-badge"><span class="cg-imp-ico cg-imp-ico-upload"></span></span>
          <span class="cg-imp-drop-title">${esc(t('chatGuard.words.importDrop'))}</span>
          <span class="cg-imp-drop-sub">${esc(t('chatGuard.words.importBrowse'))}</span>
          <input type="file" accept=".json,application/json" hidden>
        </label>
        <p class="cg-imp-file" hidden><span class="cg-imp-ico cg-imp-ico-file"></span><span class="cg-imp-file-name"></span></p>
      </section>

      <section class="cg-imp-panel" data-panel="2" hidden>
        <p class="cg-imp-lead cg-imp-summary"></p>
        <ul class="cg-imp-chips"></ul>
      </section>

      <div class="cg-problem cg-imp-problem" role="alert" hidden></div>
      <div class="cg-imp-actions">
        <button type="button" class="cuenta-btn-ghost" data-back></button>
        <button type="button" class="cuenta-btn-primary cg-imp-next" data-next></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const $ = (sel) => overlay.querySelector(sel);
  const drop = $('.cg-imp-drop');
  const fileInput = drop.querySelector('input');
  const problem = $('.cg-imp-problem');
  const back = $('[data-back]');
  const next = $('[data-next]');
  const existingSet = new Set(existing);
  let step = 0;
  let content = '';
  let words = null;
  let busy = false;

  const close = () => { if (!busy) overlay.remove(); };
  const showProblem = (key) => { problem.hidden = !key; problem.textContent = key ? t(key) : ''; };

  function renderSummary() {
    const fresh = words.filter((word) => !existingSet.has(word));
    $('.cg-imp-summary').textContent = fresh.length
      ? t('chatGuard.words.importSummary', { total: words.length, n: fresh.length })
      : t('chatGuard.words.importNoneNew');
    const chips = fresh.slice(0, PREVIEW_MAX).map((word) => `<li class="cg-imp-chip">${esc(word)}</li>`);
    if (fresh.length > PREVIEW_MAX) chips.push(`<li class="cg-imp-chip is-more">${esc(t('chatGuard.words.importMore', { n: fresh.length - PREVIEW_MAX }))}</li>`);
    $('.cg-imp-chips').innerHTML = chips.join('');
    return fresh.length;
  }

  function render() {
    overlay.querySelectorAll('.cg-imp-step').forEach((el, i) => {
      el.classList.toggle('is-active', i === step);
      el.classList.toggle('is-done', i < step);
      if (i === step) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    overlay.querySelectorAll('.cg-imp-panel').forEach((el) => { el.hidden = Number(el.dataset.panel) !== step; });
    back.textContent = t(step === 0 ? 'chatGuard.words.importCancel' : 'chatGuard.words.importBack');
    next.textContent = t(step === 2 ? 'chatGuard.words.importConfirm' : 'chatGuard.words.importNext');
    next.disabled = (step === 1 && !words) || (step === 2 && renderSummary() === 0);
  }

  async function loadFile(file) {
    if (!file) return;
    words = null;
    $('.cg-imp-file').hidden = true;
    if (!isJsonFile(file)) { showProblem('chatGuard.words.importNotJson'); return render(); }
    try {
      content = await file.text();
    } catch {
      showProblem('chatGuard.words.importReadError');
      return render();
    }
    words = parseWordList(content);
    if (!words) showProblem('errors.chatGuardImportInvalid');
    else if (!words.length) { words = null; showProblem('chatGuard.words.importEmpty'); }
    else {
      showProblem('');
      $('.cg-imp-file-name').textContent = t('chatGuard.words.importFileReady', { file: file.name, n: words.length });
      $('.cg-imp-file').hidden = false;
    }
    render();
  }

  async function goNext() {
    if (step < 2) { step += 1; showProblem(''); render(); return; }
    busy = true;
    next.disabled = back.disabled = true;
    const done = await importar(content);
    busy = false;
    back.disabled = false;
    if (done) close(); else render();
  }

  async function copyExample() {
    const button = $('[data-copy]');
    try {
      await navigator.clipboard.writeText(EXAMPLE);
      button.classList.add('is-copied');
      button.setAttribute('aria-label', t('chatGuard.words.importCopied'));
      setTimeout(() => { button.classList.remove('is-copied'); button.setAttribute('aria-label', t('chatGuard.words.importCopy')); }, 1500);
    } catch { /* sin portapapeles: el ejemplo sigue visible para copiarlo a mano */ }
  }

  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => { loadFile(fileInput.files[0]); fileInput.value = ''; });
  // Todo el popup frena el soltar: fuera de el, Electron abriria el archivo como pagina.
  // Solo el paso "Importar" lo acepta.
  overlay.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.toggle('is-over', step === 1); });
  overlay.addEventListener('dragleave', (e) => { if (e.target === overlay || e.target === drop) drop.classList.remove('is-over'); });
  overlay.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    if (step === 1) loadFile(e.dataTransfer.files[0]);
  });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  $('[data-cancel]').addEventListener('click', close);
  $('[data-copy]').addEventListener('click', copyExample);
  back.addEventListener('click', () => {
    if (step === 0) return close();
    step -= 1;
    showProblem('');
    render();
  });
  next.addEventListener('click', goNext);

  render();
  next.focus();
}
