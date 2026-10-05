import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { LOCALES } from './chat-guard-options.js';
import { isLocked } from './is-locked.js';
import { languageLabel, effectiveLanguagesText } from './language-label.js';

const checkboxMarkup = ({ code }) => `
  <label class="cg-check cg-check-compact">
    <input type="checkbox" value="${code}" aria-describedby="cgLangHint">
    <span class="cg-option-title" data-lang-label="${code}"></span>
  </label>`;

export function mountLanguagePicker(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgLangTitle" data-i18n="chatGuard.lang.title"></div>
    <div class="cg-master cg-lang-auto">
      <div class="cg-master-text">
        <div class="cg-option-title" id="cgLangAutoLabel" data-i18n="chatGuard.lang.auto"></div>
        <div class="cg-hint" id="cgLangAutoDesc" data-i18n="chatGuard.lang.autoHint"></div>
      </div>
      <button type="button" class="cg-switch" role="switch" aria-checked="false"
        aria-labelledby="cgLangAutoLabel" aria-describedby="cgLangAutoDesc" disabled>
        <span class="cg-switch-thumb"></span>
      </button>
    </div>
    <div class="cg-hint cg-lang-now" id="cgLangNow" aria-live="polite"></div>
    <div class="cg-lang-grid" role="group" aria-labelledby="cgLangTitle">${LOCALES.map(checkboxMarkup).join('')}</div>
    <div class="cg-hint" id="cgLangHint" data-i18n="chatGuard.lang.hint"></div>
    <div class="cg-problem" id="cgLangProblem" role="alert" hidden></div>`;
  aplicarTraducciones(container);

  const autoSwitch = container.querySelector('.cg-switch');
  const now = container.querySelector('#cgLangNow');
  const checkboxes = [...container.querySelectorAll('input[type="checkbox"]')];
  const problem = container.querySelector('#cgLangProblem');
  autoSwitch.addEventListener('click', () => actions.setLangsAuto(autoSwitch.getAttribute('aria-checked') !== 'true'));
  container.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (checkbox) actions.setLanguage(checkbox.value, checkbox.checked);
  });

  function renderLabels() {
    for (const span of container.querySelectorAll('[data-lang-label]')) {
      span.textContent = languageLabel(LOCALES.find((locale) => locale.code === span.dataset.langLabel));
    }
  }

  function render(state) {
    const locked = isLocked(state);
    const ready = state.phase === 'ready';
    const auto = ready && state.status.langsAuto !== false;
    container.classList.toggle('is-locked', locked);
    container.classList.toggle('is-auto', auto);
    autoSwitch.disabled = locked;
    autoSwitch.setAttribute('aria-checked', String(auto));
    renderLabels();
    const effective = ready ? state.status.effectiveLangs || [] : [];
    now.textContent = effective.length ? t('chatGuard.lang.now', { langs: effectiveLanguagesText(effective) }) : '';
    for (const checkbox of checkboxes) {
      // Con el modo automatico las casillas se ven pero no se editan: manda la voz.
      checkbox.disabled = locked || auto;
      // Si se intento quitar el ultimo idioma, el estado no cambia y esto lo deja marcado.
      checkbox.checked = ready && (auto ? effective : state.status.langs).includes(checkbox.value);
    }
    problem.hidden = !state.langProblem;
    problem.textContent = state.langProblem ? t('chatGuard.lang.minOne') : '';
  }

  render(store.getState());
  return store.subscribe(render);
}
