/**
 * Eliminar cuenta, en dos pasos (diseno Figma 663:3893 y 663:3950):
 *  1) formulario del motivo — obligatorio para continuar;
 *  2) confirmacion: escribir la palabra ("borrar", "delete"...) mas contrasena
 *     (si `hasPassword`) o reconfirmar con Google (si `googleLinked`) — una
 *     cuenta 100% Google (sin password) no tiene la opcion de password porque
 *     hoy no hay forma de setear una despues.
 * `eliminar(password)` / `eliminarGoogle(datos)` hacen el pedido y devuelven
 * true si la cuenta se borro (cierra el modal) o false si fallo (sigue abierto).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { autenticarConGoogleUI } from './plataforma-auth-cliente.js';

const MOTIVOS = ['noUso', 'tecnico', 'dificil', 'funciones', 'alternativa', 'otro'];
const normalizar = (texto) => texto.trim().toLocaleLowerCase();

export function abrirModalEliminarCuenta({ hasPassword, googleLinked, eliminar, eliminarGoogle }) {
  const palabra = t('cuenta.deleteWord');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content fm-modal" role="dialog" aria-modal="true" aria-labelledby="cuentaDeleteTitle">
      <button class="modal-close" type="button" id="cuentaDeleteClose" aria-label="${esc(t('cuenta.deleteCancel'))}"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <form id="cuentaDeleteStep1" class="fm-form">
        <h2 class="fm-title" id="cuentaDeleteTitle">${esc(t('cuenta.bajaTitle'))}</h2>
        <p class="fm-desc">${esc(t('cuenta.bajaIntro'))}</p>
        <fieldset class="fm-fieldset">
          <legend class="fm-legend">${esc(t('cuenta.bajaMotivoLabel'))}</legend>
          <div class="fm-chips">
            ${MOTIVOS.map((m) => `<label class="fm-chip"><input type="radio" name="motivo" value="${m}"><span>${esc(t('cuenta.bajaMotivo.' + m))}</span></label>`).join('')}
          </div>
        </fieldset>
        <div class="fm-field">
          <label for="cuentaBajaComentario">${esc(t('cuenta.bajaComentario'))}</label>
          <textarea id="cuentaBajaComentario" rows="3" maxlength="900"></textarea>
        </div>
        <div class="fm-field">
          <label for="cuentaBajaEmail">${esc(t('cuenta.bajaEmail'))}</label>
          <input type="email" id="cuentaBajaEmail" autocomplete="off" maxlength="254">
        </div>
        <div class="fm-actions">
          <button class="fm-btn fm-btn--ghost" type="button" id="cuentaBajaCancel">${esc(t('cuenta.deleteCancel'))}</button>
          <button class="fm-btn fm-btn--primary" type="submit" id="cuentaBajaNext" disabled>${esc(t('cuenta.bajaContinuar'))}</button>
        </div>
      </form>
      <div id="cuentaDeleteStep2" class="fm-form" hidden>
        <h2 class="fm-title">${esc(t('cuenta.deleteModalTitle'))}</h2>
        <ul class="fm-list">
          <li>${esc(t('cuenta.deleteWhat'))}</li>
          <li>${esc(t('cuenta.deletePlan'))}</li>
          <li><b>${esc(t('cuenta.deleteIrreversible'))}</b></li>
        </ul>
        <div class="fm-field">
          <label for="cuentaDeleteWord">${esc(t('cuenta.deleteTypeWord', { word: palabra }))}</label>
          <input type="text" id="cuentaDeleteWord" autocomplete="off" autocapitalize="off" spellcheck="false">
        </div>
        ${hasPassword ? `
        <div class="fm-field">
          <label for="cuentaDeletePass">${esc(t('cuenta.deletePassword'))}</label>
          <input type="password" id="cuentaDeletePass" autocomplete="current-password">
        </div>` : ''}
        ${hasPassword && googleLinked ? `<p class="fm-divider">${esc(t('cuenta.or'))}</p>` : ''}
        <div class="fm-actions">
          <button class="fm-btn fm-btn--ghost" type="button" id="cuentaDeleteCancel">${esc(t('cuenta.deleteCancel'))}</button>
          ${hasPassword ? `<button class="fm-btn fm-btn--primary" type="button" id="cuentaDeleteConfirm" disabled>${esc(t('cuenta.deleteConfirm'))}</button>` : ''}
          ${googleLinked ? `<button class="fm-btn fm-btn--primary" type="button" id="cuentaDeleteGoogle" disabled><img class="icon-inline" src="icons/google.svg" alt="">${esc(t('cuenta.deleteConfirmGoogle'))}</button>` : ''}
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const modal = overlay.querySelector('.fm-modal');
  const step1 = overlay.querySelector('#cuentaDeleteStep1');
  const step2 = overlay.querySelector('#cuentaDeleteStep2');
  const siguiente = overlay.querySelector('#cuentaBajaNext');
  const motivoElegido = () => step1.querySelector('input[name="motivo"]:checked')?.value;
  let feedbackEnviado = false;
  // Mejor esfuerzo: si el webhook falla no se bloquea la baja.
  async function enviarFeedback() {
    if (feedbackEnviado) return;
    feedbackEnviado = true;
    try {
      await fetch('/api/baja-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: motivoElegido(),
          comentario: overlay.querySelector('#cuentaBajaComentario').value,
          email: overlay.querySelector('#cuentaBajaEmail').value,
        }),
      });
    } catch { /* sin red: se elimina igual */ }
  }

  const palabraInput = overlay.querySelector('#cuentaDeleteWord');
  const passInput = overlay.querySelector('#cuentaDeletePass');
  const confirmar = overlay.querySelector('#cuentaDeleteConfirm');
  const confirmarGoogle = overlay.querySelector('#cuentaDeleteGoogle');
  const botones = step2.querySelectorAll('button');
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
    await enviarFeedback();
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
  overlay.querySelector('#cuentaBajaCancel').addEventListener('click', cerrarSiLibre);
  confirmar?.addEventListener('click', enviarPassword);
  step1.addEventListener('change', () => { siguiente.disabled = !motivoElegido(); });
  step1.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!motivoElegido()) return;
    step1.hidden = true;
    step2.hidden = false;
    modal.classList.add('fm-modal--confirm');
    palabraInput.focus();
  });
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
    await enviarFeedback();
    const borrada = await eliminarGoogle(datos);
    if (borrada) return cerrar();
    enCurso = false;
    bloquear(false);
    actualizarConfirmar();
  });
  step1.querySelector('input[name="motivo"]').focus();
}
