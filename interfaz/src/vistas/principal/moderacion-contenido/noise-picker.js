import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

const MODES = ['enforce', 'shadow', 'off'];

const optionMarkup = (mode) => `
  <label class="cg-option">
    <input type="radio" name="cgNoise" value="${mode}" aria-describedby="cgNoiseDesc-${mode}">
    <span class="cg-option-body">
      <span class="cg-option-title" data-i18n="chatGuard.noise.${mode}"></span>
      <span class="cg-hint" id="cgNoiseDesc-${mode}" data-i18n="chatGuard.noise.${mode}Desc"></span>
    </span>
  </label>`;

// Texto sin sentido: no se lee (enforce), solo se avisa (shadow) o se ignora (off).
// Independiente del motor de contenido: funciona aunque este apagado.
export function mountNoisePicker(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" id="cgNoiseTitle" data-i18n="chatGuard.noise.title"></div>
    <p class="cg-hint" data-i18n="chatGuard.noise.desc"></p>
    <div class="cg-options" role="radiogroup" aria-labelledby="cgNoiseTitle">${MODES.map(optionMarkup).join('')}</div>`;
  aplicarTraducciones(container);

  const radios = [...container.querySelectorAll('input[type="radio"]')];
  container.addEventListener('change', (event) => {
    const radio = event.target.closest('input[type="radio"]');
    if (radio) actions.setGibberishMode(radio.value);
  });

  function render(state) {
    const ready = state.phase === 'ready';
    container.classList.toggle('is-locked', !ready);
    for (const radio of radios) {
      radio.disabled = !ready;
      radio.checked = ready && state.status.gibberishMode === radio.value;
    }
  }

  render(store.getState());
  return store.subscribe(render);
}
