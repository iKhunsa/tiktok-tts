import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { CUSTOM_OPTIONS } from './chat-guard-options.js';
import { isLocked } from './is-locked.js';

const optionMarkup = (option) => `
  <label class="cg-check">
    <input type="checkbox" data-option="${option}" aria-describedby="cgCustomHint-${option}">
    <span class="cg-option-body">
      <span class="cg-option-title" data-i18n="chatGuard.custom.${option}"></span>
      <span class="cg-hint" id="cgCustomHint-${option}" data-i18n="chatGuard.custom.${option}Hint"></span>
    </span>
  </label>`;

// Solo se ve con el nivel Personalizado.
export function mountCustomOptions(container, { store, actions }) {
  container.innerHTML = CUSTOM_OPTIONS.map(optionMarkup).join('');
  aplicarTraducciones(container);

  const checkboxes = [...container.querySelectorAll('input[type="checkbox"]')];
  container.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (checkbox) actions.setCustomOption(checkbox.dataset.option, checkbox.checked);
  });

  function render(state) {
    const visible = state.phase === 'ready' && state.status.level === 'custom';
    container.hidden = !visible;
    if (!visible) return;
    const locked = isLocked(state);
    for (const checkbox of checkboxes) {
      checkbox.disabled = locked;
      checkbox.checked = Boolean(state.status.custom && state.status.custom[checkbox.dataset.option]);
    }
  }

  render(store.getState());
  return store.subscribe(render);
}
