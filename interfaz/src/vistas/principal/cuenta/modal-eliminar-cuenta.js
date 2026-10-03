/**
 * Modal de confirmacion para eliminar la cuenta. Pide la contrasena actual;
 * el boton final queda deshabilitado hasta escribirla. `eliminar(password)`
 * hace el pedido y devuelve true si la cuenta se borro (cierra el modal) o
 * false si fallo (el modal sigue abierto para reintentar).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';

export function abrirModalEliminarCuenta({ eliminar }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content cuenta-delete-modal" role="dialog" aria-modal="true" aria-labelledby="cuentaDeleteTitle">
      <button class="modal-close" type="button" id="cuentaDeleteClose" aria-label="${esc(t('cuenta.deleteCancel'))}"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <div class="notice-icon-badge"><span class="icon-inline notice-icon-warn" aria-hidden="true"></span></div>
      <h2 id="cuentaDeleteTitle">${esc(t('cuenta.deleteModalTitle'))}</h2>
      <ul class="cuenta-delete-list">
        <li>${esc(t('cuenta.deleteWhat'))}</li>
        <li>${esc(t('cuenta.deletePlan'))}</li>
        <li><b>${esc(t('cuenta.deleteIrreversible'))}</b></li>
      </ul>
      <div class="cuenta-field">
        <label for="cuentaDeletePass">${esc(t('cuenta.deletePassword'))}</label>
        <input type="password" id="cuentaDeletePass" autocomplete="current-password">
      </div>
      <div class="cuenta-delete-actions">
        <button class="cuenta-btn-ghost" type="button" id="cuentaDeleteCancel">${esc(t('cuenta.deleteCancel'))}</button>
        <button class="cuenta-btn-ghost cuenta-btn-danger" type="button" id="cuentaDeleteConfirm" disabled>${esc(t('cuenta.deleteConfirm'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#cuentaDeletePass');
  const confirmar = overlay.querySelector('#cuentaDeleteConfirm');
  const botones = overlay.querySelectorAll('button');
  let enCurso = false;

  const cerrar = () => overlay.remove();
  const cerrarSiLibre = () => { if (!enCurso) cerrar(); };

  async function enviar() {
    if (enCurso || !input.value) return;
    enCurso = true;
    botones.forEach((b) => { b.disabled = true; });
    input.disabled = true;
    const borrada = await eliminar(input.value);
    if (borrada) return cerrar();
    enCurso = false;
    botones.forEach((b) => { b.disabled = false; });
    input.disabled = false;
    confirmar.disabled = !input.value;
    input.focus();
  }

  input.addEventListener('input', () => { confirmar.disabled = !input.value; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarSiLibre(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarSiLibre(); });
  overlay.querySelector('#cuentaDeleteClose').addEventListener('click', cerrarSiLibre);
  overlay.querySelector('#cuentaDeleteCancel').addEventListener('click', cerrarSiLibre);
  confirmar.addEventListener('click', enviar);
  input.focus();
}
