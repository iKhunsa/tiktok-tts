/**
 * Formulario de motivo de cancelacion del plan (diseno Figma 663:4185). El
 * motivo es obligatorio para poder cancelar; comentario y correo son
 * opcionales. Resuelve con { motivo, comentario, email } o null si el usuario
 * vuelve atras.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';

const MOTIVOS = ['precio', 'pocoUso', 'valor', 'tecnico', 'funciones', 'temporal'];
const chip = (m, clase = '') => `<label class="fm-chip ${clase}"><input type="radio" name="motivo" value="${m}"><span>${esc(t('cuenta.cancelFbMotivo.' + m))}</span></label>`;

export function modalFeedbackCancelacion() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content fm-modal" role="dialog" aria-modal="true" aria-labelledby="cuentaCancelFbTitle">
        <button class="modal-close" type="button" id="cuentaCancelFbClose" aria-label="${esc(t('cuenta.confirmCancelNo'))}"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <form class="fm-form">
          <h2 class="fm-title" id="cuentaCancelFbTitle">${esc(t('cuenta.cancelFbTitle'))}</h2>
          <p class="fm-desc">${esc(t('cuenta.cancelFbIntro'))}</p>
          <fieldset class="fm-fieldset">
            <legend class="fm-legend">${esc(t('cuenta.cancelFbLabel'))}</legend>
            <div class="fm-chips">${MOTIVOS.map((m) => chip(m)).join('')}</div>
            ${chip('otro', 'fm-chip--wide')}
          </fieldset>
          <div class="fm-field">
            <label for="cuentaCancelFbComentario">${esc(t('cuenta.cancelFbComentario'))}</label>
            <textarea id="cuentaCancelFbComentario" rows="3" maxlength="900"></textarea>
          </div>
          <div class="fm-field">
            <label for="cuentaCancelFbEmail">${esc(t('cuenta.bajaEmail'))}</label>
            <input type="email" id="cuentaCancelFbEmail" autocomplete="off" maxlength="254">
          </div>
          <p class="fm-hint">${esc(t('cuenta.cancelFbRequerido'))}</p>
          <div class="fm-actions">
            <button class="fm-btn fm-btn--ghost" type="button" id="cuentaCancelFbBack">${esc(t('cuenta.confirmCancelNo'))}</button>
            <button class="fm-btn fm-btn--primary" type="submit" id="cuentaCancelFbSend" disabled>${esc(t('cuenta.confirmCancelYes'))}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('form');
    const enviar = overlay.querySelector('#cuentaCancelFbSend');
    const motivo = () => form.querySelector('input[name="motivo"]:checked')?.value;
    const cerrar = (resultado) => { overlay.remove(); resolve(resultado); };
    form.addEventListener('change', () => { enviar.disabled = !motivo(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!motivo()) return;
      cerrar({
        motivo: motivo(),
        comentario: overlay.querySelector('#cuentaCancelFbComentario').value,
        email: overlay.querySelector('#cuentaCancelFbEmail').value,
      });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(null); });
    overlay.querySelector('#cuentaCancelFbClose').addEventListener('click', () => cerrar(null));
    overlay.querySelector('#cuentaCancelFbBack').addEventListener('click', () => cerrar(null));
    form.querySelector('input[name="motivo"]').focus();
  });
}
