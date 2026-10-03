import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

export function mountMasterToggle(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-master">
      <img class="icon-inline cg-master-icon" src="icons/security.svg" alt="">
      <div class="cg-master-text">
        <div class="cg-master-title" id="cgEnableLabel" data-i18n="chatGuard.enable"></div>
        <div class="cg-hint" id="cgEnableDesc" data-i18n="chatGuard.enableDesc"></div>
      </div>
      <button type="button" class="cg-switch" role="switch" aria-checked="false"
        aria-labelledby="cgEnableLabel" aria-describedby="cgEnableDesc" disabled>
        <span class="cg-switch-thumb"></span>
      </button>
    </div>
    <div class="cg-hint cg-people-note" data-i18n="chatGuard.peopleNote"></div>`;
  aplicarTraducciones(container);

  const button = container.querySelector('.cg-switch');
  button.addEventListener('click', () => actions.setEnabled(button.getAttribute('aria-checked') !== 'true'));

  function render(state) {
    const ready = state.phase === 'ready';
    button.disabled = !ready;
    button.setAttribute('aria-checked', String(ready && state.status.enabled));
  }

  render(store.getState());
  return store.subscribe(render);
}
