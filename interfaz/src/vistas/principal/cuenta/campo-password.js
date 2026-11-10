/**
 * Campo de contraseña con el boton de mostrar/ocultar, compartido por los modales de recuperar y de cambiar la
 * contraseña (los dos arman su overlay en JS). `enlazarMostrarPassword(overlay)` activa los botones de todos los
 * campos que haya dentro.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';

export function campoPass(id, labelKey, autocomplete = 'new-password') {
  return `
    <div class="cuenta-field">
      <label for="${id}" data-i18n="${labelKey}"></label>
      <div class="cuenta-pass-wrap">
        <input type="password" id="${id}" autocomplete="${autocomplete}">
        <button type="button" class="cuenta-pass-toggle" data-toggle="${id}" aria-label="${esc(t('cuenta.showPassword'))}">
          <img class="icon-inline" src="icons/visibility.svg" alt="">
        </button>
      </div>
    </div>`;
}

export function enlazarMostrarPassword(overlay) {
  overlay.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = overlay.querySelector(`#${btn.dataset.toggle}`);
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      btn.querySelector('img').src = mostrar ? 'icons/visibility_off.svg' : 'icons/visibility.svg';
      btn.setAttribute('aria-label', t(mostrar ? 'cuenta.hidePassword' : 'cuenta.showPassword'));
    });
  });
}
