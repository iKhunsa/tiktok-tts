/**
 * Modal de confirmacion para eliminar la cuenta. Pide escribir la palabra de
 * confirmacion (traducida: "borrar", "delete"...) y la contrasena actual; el
 * boton final queda deshabilitado hasta tener ambas. `eliminar(password)`
 * hace el pedido y devuelve true si la cuenta se borro (cierra el modal) o
 * false si fallo (el modal sigue abierto para reintentar).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';

const normalizar = (texto) => texto.trim().toLocaleLowerCase();

export function abrirModalEliminarCuenta({ eliminar }) {
  const palabra = t('cuenta.deleteWord');
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
        <label for="cuentaDeleteWord">${esc(t('cuenta.deleteTypeWord', { word: palabra }))}</label>
        <input type="text" id="cuentaDeleteWord" autocomplete="off" autocapitalize="off" spellcheck="false">
      </div>
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

  const palabraInput = overlay.querySelector('#cuentaDeleteWord');
  const input = overlay.querySelector('#cuentaDeletePass');
  const confirmar = overlay.querySelector('#cuentaDeleteConfirm');
  const botones = overlay.querySelectorAll('button');
  let enCurso = false;

  const listo = () => Boolean(input.value) && normalizar(palabraInput.value) === normalizar(palabra);
  const actualizarConfirmar = () => { confirmar.disabled = !listo(); };
  const cerrar = () => overlay.remove();
  const cerrarSiLibre = () => { if (!enCurso) cerrar(); };

  async function enviar() {
    if (enCurso || !listo()) return;
    enCurso = true;
    botones.forEach((b) => { b.disabled = true; });
    input.disabled = true;
    palabraInput.disabled = true;
    const borrada = await eliminar(input.value);
    if (borrada) return cerrar();
    enCurso = false;
    botones.forEach((b) => { b.disabled = false; });
    input.disabled = false;
    palabraInput.disabled = false;
    actualizarConfirmar();
    input.focus();
  }

  [palabraInput, input].forEach((campo) => {
    campo.addEventListener('input', actualizarConfirmar);
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
  });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarSiLibre(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarSiLibre(); });
  overlay.querySelector('#cuentaDeleteClose').addEventListener('click', cerrarSiLibre);
  overlay.querySelector('#cuentaDeleteCancel').addEventListener('click', cerrarSiLibre);
  confirmar.addEventListener('click', enviar);
  palabraInput.focus();
}
