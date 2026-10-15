import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { LEVELS } from './chat-guard-options.js';
import { isLocked } from './is-locked.js';

const optionMarkup = (level) => `
  <label class="cg-option" data-level="${level}">
    <input type="radio" name="cgLevel" value="${level}" aria-describedby="cgLevelDesc-${level}">
    <span class="cg-option-body">
      <span class="cg-option-title" data-i18n="chatGuard.level.${level}"></span>
      <span class="cg-hint" id="cgLevelDesc-${level}" data-i18n="chatGuard.level.${level}Desc"></span>
    </span>
  </label>`;

export function mountLevelPicker(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgLevelTitle" data-i18n="chatGuard.level.title"></div>
    <div class="cg-options" role="radiogroup" aria-labelledby="cgLevelTitle">${LEVELS.map(optionMarkup).join('')}</div>`;
  aplicarTraducciones(container);

  const radios = [...container.querySelectorAll('input[type="radio"]')];
  container.addEventListener('change', (event) => {
    const radio = event.target.closest('input[type="radio"]');
    if (!radio) return;
    actions.setLevel(radio.value, `chatGuard.level.${radio.value}`);
  });

  function render(state) {
    const locked = isLocked(state);
    container.classList.toggle('is-locked', locked);
    for (const radio of radios) {
      radio.disabled = locked;
      radio.checked = state.phase === 'ready' && state.status.level === radio.value;
    }
  }

  render(store.getState());
  return store.subscribe(render);
}
