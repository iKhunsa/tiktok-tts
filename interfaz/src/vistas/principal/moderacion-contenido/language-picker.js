import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { LOCALES } from './chat-guard-options.js';
import { isLocked } from './is-locked.js';

const checkboxMarkup = ({ code, labelKey }) => `
  <label class="cg-check cg-check-compact">
    <input type="checkbox" value="${code}" aria-describedby="cgLangHint">
    <span class="cg-option-title" data-i18n="${labelKey}"></span>
  </label>`;

export function mountLanguagePicker(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgLangTitle" data-i18n="chatGuard.lang.title"></div>
    <div class="cg-lang-grid" role="group" aria-labelledby="cgLangTitle">${LOCALES.map(checkboxMarkup).join('')}</div>
    <div class="cg-hint" id="cgLangHint" data-i18n="chatGuard.lang.hint"></div>
    <div class="cg-problem" id="cgLangProblem" role="alert" hidden></div>`;
  aplicarTraducciones(container);

  const checkboxes = [...container.querySelectorAll('input[type="checkbox"]')];
  const problem = container.querySelector('#cgLangProblem');
  container.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (checkbox) actions.setLanguage(checkbox.value, checkbox.checked);
  });

  function render(state) {
    const locked = isLocked(state);
    container.classList.toggle('is-locked', locked);
    for (const checkbox of checkboxes) {
      checkbox.disabled = locked;
      // Si se intento quitar el ultimo idioma, el estado no cambia y esto lo deja marcado.
      checkbox.checked = state.phase === 'ready' && state.status.langs.includes(checkbox.value);
    }
    problem.hidden = !state.langProblem;
    problem.textContent = state.langProblem ? t('chatGuard.lang.minOne') : '';
  }

  render(store.getState());
  return store.subscribe(render);
}
