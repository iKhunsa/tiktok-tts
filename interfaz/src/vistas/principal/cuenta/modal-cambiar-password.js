/**
 * Modal "Cambiar contraseña" del perfil: contraseña actual + nueva (dos veces). Es distinto de modal-recuperar.js
 * ("olvide mi contraseña", sin sesion y con un codigo por email). Mismo patron factory: el overlay se crea en JS y se
 * destruye al cerrar. Las contraseñas solo viajan en el PATCH y no se guardan ni se muestran en ningun otro lado.
 */
import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { pedir, toastError } from './api.js';
import { campoPass, enlazarMostrarPassword } from './campo-password.js';

export function abrirModalCambiarPassword() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content cuenta-recover-modal" role="dialog" aria-modal="true" aria-labelledby="cpTitle">
      <button class="modal-close" type="button" data-cancel><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="cpTitle" data-i18n="cuentaModal.changePassword"></h2>
      ${campoPass('cpActual', 'cuentaModal.currentPassword', 'current-password')}
      ${campoPass('cpNueva', 'cuenta.resetNewPasswordLabel')}
      ${campoPass('cpRepetida', 'cuenta.resetConfirmPasswordLabel')}
      <button type="button" class="cuenta-btn-primary" data-submit data-i18n="cuentaModal.update"></button>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  const $ = (sel) => overlay.querySelector(sel);
  let busy = false;
  const close = () => { if (!busy) overlay.remove(); };

  async function guardar() {
    if (busy) return;
    const actual = $('#cpActual').value;
    const nueva = $('#cpNueva').value;
    if (!actual || !nueva) return;
    if (nueva !== $('#cpRepetida').value) return showToast(t('cuenta.resetMismatch'));

    const btn = $('[data-submit]');
    btn.disabled = true;
    busy = true;
    try {
      const r = await pedir('/api/account/password', { method: 'PATCH', body: { currentPassword: actual, newPassword: nueva } });
      if (!r.ok) {
        toastError(r.body, 'errors.generic');
        if (r.status === 403) { // la actual no coincide: se vuelve a pedir
          $('#cpActual').value = '';
          $('#cpActual').focus();
        }
        return;
      }
      showToast(t('cuentaModal.passwordChanged'));
      overlay.remove();
    } finally {
      btn.disabled = false;
      busy = false;
    }
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'Enter' && e.target.tagName === 'INPUT') guardar(); // en un boton, Enter ya es su clic
  });
  $('[data-cancel]').addEventListener('click', close);
  $('[data-submit]').addEventListener('click', guardar);
  enlazarMostrarPassword(overlay);
  $('#cpActual').focus();
}
