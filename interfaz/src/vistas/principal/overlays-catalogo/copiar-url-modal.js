import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { get, set } from '../../../nucleo/estado/datos-por-cuenta.js';

const CLAVE_TUTORIAL_VISTO = 'escenaActivaTutorialVisto';

const opcionHtml = ({ atributo, titulo, descripcion, recomendada }) => `
  <button type="button" class="copiar-url-opcion${recomendada ? ' is-recomendada' : ''}" ${atributo}>
    <span class="copiar-url-opcion-titulo">
      <span data-i18n="overlayCat.editor.${titulo}"></span>
      ${recomendada ? '<span class="copiar-url-badge" data-i18n="overlayCat.editor.copiarUrlRecomendado"></span>' : ''}
    </span>
    <span class="copiar-url-opcion-desc" data-i18n="overlayCat.editor.${descripcion}"></span>
  </button>`;

/**
 * Modal para elegir entre el enlace de una sola escena o el de escena activa (una sola fuente de OBS + atajos de teclado).
 * `iniciarTutorial` arranca el tour del atajo: solo (una vez por cuenta) tras copiar el enlace de escena activa, o desde "Ver tutorial".
 */
export function abrirModalCopiarUrl(escenaId, iniciarTutorial) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content copiar-url-modal" role="dialog" aria-modal="true" aria-labelledby="copiarUrlTitulo">
      <button class="modal-close" type="button" data-cerrar><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="copiarUrlTitulo" data-i18n="overlayCat.editor.copiarUrlModalTitulo"></h2>
      <p class="cuenta-hint" data-i18n="overlayCat.editor.copiarUrlModalSub"></p>
      <div class="copiar-url-opciones">
        ${opcionHtml({ atributo: 'data-dinamica', titulo: 'copiarUrlTodasTitulo', descripcion: 'copiarUrlTodasDesc', recomendada: true })}
        ${opcionHtml({ atributo: 'data-esta-escena', titulo: 'copiarUrlEstaEscenaTitulo', descripcion: 'copiarUrlEstaEscenaDesc' })}
      </div>
      <div class="copiar-url-pie">
        <p class="cuenta-hint" data-i18n="overlayCat.editor.copiarUrlPie"></p>
        <button type="button" class="cuenta-btn-ghost copiar-url-tutorial" data-tutorial>
          <img class="icon-inline" src="icons/play_arrow.svg" alt=""><span data-i18n="overlayCat.editor.copiarUrlTutorial"></span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  const cerrar = () => overlay.remove();
  const mostrarTutorial = () => { set(CLAVE_TUTORIAL_VISTO, '1'); iniciarTutorial(); };
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrar(); });
  overlay.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrar(); });
  overlay.querySelector('[data-cerrar]').addEventListener('click', cerrar);

  const copiar = (url) => navigator.clipboard.writeText(url)
    .then(() => showToast(t('overlayCat.editor.copiarUrlCopiado')))
    .catch(() => showToast(t('toast.copyError'), 'error'));

  overlay.querySelector('[data-esta-escena]').addEventListener('click', () => { copiar(`${location.origin}/overlay-escena.html?e=${escenaId}`); cerrar(); });
  overlay.querySelector('[data-dinamica]').addEventListener('click', () => {
    copiar(`${location.origin}/overlay-escena.html?e=dinamica`);
    cerrar();
    if (!get(CLAVE_TUTORIAL_VISTO)) mostrarTutorial();
  });
  overlay.querySelector('[data-tutorial]').addEventListener('click', () => { cerrar(); mostrarTutorial(); });
}
