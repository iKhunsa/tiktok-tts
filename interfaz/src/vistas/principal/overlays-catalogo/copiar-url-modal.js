import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { showToast } from '../../../componentes/toast.js';

/** Modal para elegir entre el enlace fijo de esta escena o el dinamico que sigue la escena activa (atajos de teclado). */
export function abrirModalCopiarUrl(escenaId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content copiar-url-modal" role="dialog" aria-modal="true" aria-labelledby="copiarUrlTitulo">
      <button class="modal-close" type="button" data-cerrar><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="copiarUrlTitulo" data-i18n="overlayCat.editor.copiarUrlModalTitulo"></h2>
      <p class="cuenta-hint" data-i18n="overlayCat.editor.copiarUrlModalSub"></p>
      <div class="edi-export-acciones copiar-url-acciones">
        <button type="button" class="cuenta-btn-ghost" data-esta-escena>${esc(t('overlayCat.editor.copiarUrlEstaEscena'))}</button>
        <button type="button" class="cuenta-btn-primary" data-dinamica>${esc(t('overlayCat.editor.copiarUrlDinamica'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  const cerrar = () => overlay.remove();
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrar(); });
  overlay.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrar(); });
  overlay.querySelector('[data-cerrar]').addEventListener('click', cerrar);

  const copiar = (url) => navigator.clipboard.writeText(url)
    .then(() => showToast(t('toast.urlCopied')))
    .catch(() => showToast(t('toast.copyError'), 'error'));

  overlay.querySelector('[data-esta-escena]').addEventListener('click', () => { copiar(`${location.origin}/overlay-escena.html?e=${escenaId}`); cerrar(); });
  overlay.querySelector('[data-dinamica]').addEventListener('click', () => { copiar(`${location.origin}/overlay-escena.html?e=dinamica`); cerrar(); });
}
