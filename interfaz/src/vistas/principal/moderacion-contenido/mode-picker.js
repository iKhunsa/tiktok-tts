import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { isLocked } from './is-locked.js';

const MODES = ['shadow', 'enforce'];

const optionMarkup = (mode) => `
  <label class="cg-option">
    <input type="radio" name="cgMode" value="${mode}" aria-describedby="cgModeDesc-${mode}">
    <span class="cg-option-body">
      <span class="cg-option-title" data-i18n="chatGuard.mode.${mode}"></span>
      <span class="cg-hint" id="cgModeDesc-${mode}" data-i18n="chatGuard.mode.${mode}Desc"></span>
    </span>
  </label>`;

// "Solo avisar" (shadow) frente a "Aplicar" (enforce), en lenguaje llano.
export function mountModePicker(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgModeTitle" data-i18n="chatGuard.mode.title"></div>
    <div class="cg-options" role="radiogroup" aria-labelledby="cgModeTitle">${MODES.map(optionMarkup).join('')}</div>`;
  aplicarTraducciones(container);

  const radios = [...container.querySelectorAll('input[type="radio"]')];
  container.addEventListener('change', (event) => {
    const radio = event.target.closest('input[type="radio"]');
    if (radio) actions.setMode(radio.value);
  });

  function render(state) {
    const locked = isLocked(state);
    container.classList.toggle('is-locked', locked);
    for (const radio of radios) {
      radio.disabled = locked;
      radio.checked = state.phase === 'ready' && state.status.mode === radio.value;
    }
  }

  render(store.getState());
  return store.subscribe(render);
}
