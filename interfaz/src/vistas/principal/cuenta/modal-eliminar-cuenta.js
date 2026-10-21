/**
 * Modal de confirmacion para eliminar la cuenta. Pide escribir la palabra de
 * confirmacion (traducida: "borrar", "delete"...) siempre, mas uno de los dos
 * metodos disponibles: contrasena (si `hasPassword`) o reconfirmar con Google
 * (si `googleLinked`) — una cuenta 100% Google (sin password) no tiene la
 * opcion de password porque hoy no hay forma de setear una despues.
 * `eliminar(password)` / `eliminarGoogle(datos)` hacen el pedido y devuelven
 * true si la cuenta se borro (cierra el modal) o false si fallo (sigue abierto).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { autenticarConGoogleUI } from './plataforma-auth-cliente.js';

const normalizar = (texto) => texto.trim().toLocaleLowerCase();

export function abrirModalEliminarCuenta({ hasPassword, googleLinked, eliminar, eliminarGoogle }) {
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
      ${hasPassword ? `
      <div class="cuenta-field">
        <label for="cuentaDeletePass">${esc(t('cuenta.deletePassword'))}</label>
        <input type="password" id="cuentaDeletePass" autocomplete="current-password">
      </div>` : ''}
      ${hasPassword && googleLinked ? `<div class="cuenta-divider">${esc(t('cuenta.or'))}</div>` : ''}
      <div class="cuenta-delete-actions">
        <button class="cuenta-btn-ghost" type="button" id="cuentaDeleteCancel">${esc(t('cuenta.deleteCancel'))}</button>
        ${googleLinked ? `<button class="cuenta-btn-ghost cuenta-btn-danger cuenta-btn-icon" type="button" id="cuentaDeleteGoogle" disabled><img class="icon-inline" src="icons/google.svg" alt="">${esc(t('cuenta.deleteConfirmGoogle'))}</button>` : ''}
        ${hasPassword ? `<button class="cuenta-btn-ghost cuenta-btn-danger" type="button" id="cuentaDeleteConfirm" disabled>${esc(t('cuenta.deleteConfirm'))}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const palabraInput = overlay.querySelector('#cuentaDeleteWord');
  const passInput = overlay.querySelector('#cuentaDeletePass');
  const confirmar = overlay.querySelector('#cuentaDeleteConfirm');
  const confirmarGoogle = overlay.querySelector('#cuentaDeleteGoogle');
  const botones = overlay.querySelectorAll('button');
  let enCurso = false;

  const palabraOk = () => normalizar(palabraInput.value) === normalizar(palabra);
  const actualizarConfirmar = () => {
    if (confirmar) confirmar.disabled = !(palabraOk() && Boolean(passInput.value));
    if (confirmarGoogle) confirmarGoogle.disabled = !palabraOk();
  };
  const cerrar = () => overlay.remove();
  const cerrarSiLibre = () => { if (!enCurso) cerrar(); };
  const bloquear = (bloqueado) => {
    botones.forEach((b) => { b.disabled = bloqueado; });
    palabraInput.disabled = bloqueado;
    if (passInput) passInput.disabled = bloqueado;
  };

  async function enviar(accion) {
    if (enCurso) return;
    enCurso = true;
    bloquear(true);
    const borrada = await accion();
    if (borrada) return cerrar();
    enCurso = false;
    bloquear(false);
    actualizarConfirmar();
  }

  const enviarPassword = () => {
    if (!palabraOk() || !passInput.value) return;
    enviar(() => eliminar(passInput.value));
  };

  [palabraInput, passInput].filter(Boolean).forEach((campo) => {
    campo.addEventListener('input', actualizarConfirmar);
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarPassword(); });
  });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarSiLibre(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarSiLibre(); });
  overlay.querySelector('#cuentaDeleteClose').addEventListener('click', cerrarSiLibre);
  overlay.querySelector('#cuentaDeleteCancel').addEventListener('click', cerrarSiLibre);
  confirmar?.addEventListener('click', enviarPassword);
  confirmarGoogle?.addEventListener('click', async () => {
    if (enCurso || !palabraOk()) return;
    enCurso = true;
    bloquear(true);
    const datos = await autenticarConGoogleUI();
    if (!datos) {
      enCurso = false;
      bloquear(false);
      actualizarConfirmar();
      return;
    }
    const borrada = await eliminarGoogle(datos);
    if (borrada) return cerrar();
    enCurso = false;
    bloquear(false);
    actualizarConfirmar();
  });
  palabraInput.focus();
}
