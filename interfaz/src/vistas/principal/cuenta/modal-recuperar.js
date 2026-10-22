/**
 * Modal "Olvidaste tu contraseña" en 2 pasos: confirmar envio del codigo ->
 * ingresar codigo + contraseña nueva. Mismo patron factory que
 * moderacion-contenido/import-modal.js (overlay creado en JS, un solo
 * modulo, sin markup estatico en index.html).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { pedir, toastError } from './api.js';

function campoPass(id, labelKey) {
  return `
    <div class="cuenta-field">
      <label for="${id}" data-i18n="${labelKey}"></label>
      <div class="cuenta-pass-wrap">
        <input type="password" id="${id}" autocomplete="new-password">
        <button type="button" class="cuenta-pass-toggle" data-toggle="${id}" aria-label="${esc(t('cuenta.showPassword'))}">
          <img class="icon-inline" src="icons/visibility.svg" alt="">
        </button>
      </div>
    </div>`;
}

export function abrirModalRecuperar({ emailInicial }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="rpTitle">
      <button class="modal-close" type="button" data-cancel><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="rpTitle" data-i18n="cuenta.forgotModalTitle"></h2>

      <section data-panel="0">
        <p class="cuenta-card-sub" data-panel0-text></p>
        <div class="cuenta-field">
          <label for="rpEmail" data-i18n="cuenta.email"></label>
          <input type="email" id="rpEmail" autocomplete="email" value="${esc(emailInicial || '')}">
        </div>
        <button type="button" class="cuenta-btn-primary" data-send data-i18n="cuenta.forgotSendBtn"></button>
        <button type="button" class="cuenta-btn-ghost" data-cancel-inline data-i18n="cuenta.forgotCancelBtn"></button>
      </section>

      <section data-panel="1" hidden>
        <p class="cuenta-hint" data-panel1-text></p>
        <div class="cuenta-field">
          <label for="rpCode" data-i18n="cuenta.resetCodeLabel"></label>
          <input type="text" id="rpCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
        </div>
        ${campoPass('rpNewPass', 'cuenta.resetNewPasswordLabel')}
        ${campoPass('rpConfirmPass', 'cuenta.resetConfirmPasswordLabel')}
        <button type="button" class="cuenta-btn-primary" data-submit data-i18n="cuenta.resetSubmitBtn"></button>
        <button type="button" class="cuenta-btn-ghost" data-back data-i18n="cuenta.resetBackBtn"></button>
      </section>
    </div>`;
  document.body.appendChild(overlay);

  const $ = (sel) => overlay.querySelector(sel);
  overlay.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });

  let email = (emailInicial || '').trim();
  let busy = false;
  const close = () => { if (!busy) overlay.remove(); };

  function mostrarPaso(n) {
    overlay.querySelectorAll('[data-panel]').forEach((el) => { el.hidden = Number(el.dataset.panel) !== n; });
    if (n === 0) $('[data-panel0-text]').textContent = email
      ? t('cuenta.forgotConfirmText', { email })
      : t('cuenta.forgotConfirmText', { email: '' });
    if (n === 1) $('[data-panel1-text]').textContent = t('cuenta.forgotSentHint', { email });
  }

  async function enviarCodigo() {
    email = ($('#rpEmail').value || '').trim();
    if (!email) return;
    const btn = $('[data-send]');
    btn.disabled = true;
    busy = true;
    try {
      const r = await pedir('/api/auth/forgot-password', { method: 'POST', body: { email } });
      if (!r.ok) return toastError(r.body, 'errors.generic');
      mostrarPaso(1);
      overlay.querySelector('#rpCode')?.focus();
    } finally {
      btn.disabled = false;
      busy = false;
    }
  }

  async function confirmarReset() {
    const code = ($('#rpCode').value || '').trim();
    const nueva = $('#rpNewPass').value;
    const repetida = $('#rpConfirmPass').value;
    if (nueva !== repetida) return showToast(t('cuenta.resetMismatch'));

    const btn = $('[data-submit]');
    btn.disabled = true;
    busy = true;
    try {
      const r = await pedir('/api/auth/reset-password', { method: 'POST', body: { email, code, newPassword: nueva } });
      if (!r.ok) return toastError(r.body, 'errors.invalidResetCode');
      showToast(t('cuenta.resetSuccess'));
      overlay.remove();
    } finally {
      btn.disabled = false;
      busy = false;
    }
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('[data-cancel]').addEventListener('click', close);
  $('[data-cancel-inline]').addEventListener('click', close);
  $('[data-send]').addEventListener('click', enviarCodigo);
  $('[data-back]').addEventListener('click', () => mostrarPaso(0));
  $('[data-submit]').addEventListener('click', confirmarReset);
  overlay.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = overlay.querySelector(`#${btn.dataset.toggle}`);
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      btn.querySelector('img').src = mostrar ? 'icons/visibility_off.svg' : 'icons/visibility.svg';
      btn.setAttribute('aria-label', t(mostrar ? 'cuenta.hidePassword' : 'cuenta.showPassword'));
    });
  });

  mostrarPaso(0);
  $('#rpEmail').focus();
}
