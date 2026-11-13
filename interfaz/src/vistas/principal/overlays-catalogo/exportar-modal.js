import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';
import { exportarEscenas } from './exportar-importar.js';

const nombreEscena = (e, i) => e.nombre || t('overlayCat.editor.escena', { n: i + 1 });

/** Modal para elegir que escenas exportar y si van en un solo archivo o uno por escena. */
export function abrirModalExportar() {
  const { escenas } = appSettings;
  if (!escenas.length) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="expEscenasTitulo">
      <button class="modal-close" type="button" data-cerrar><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 id="expEscenasTitulo" data-i18n="overlayCat.editor.exportarTitulo"></h2>
      <p class="cuenta-hint" data-i18n="overlayCat.editor.exportarSub"></p>
      <div class="edi-export-lista" role="group" aria-labelledby="expEscenasTitulo">
        ${escenas.map((e, i) => `
          <label class="edi-export-fila">
            <input type="checkbox" value="${i}" checked>
            <span>${esc(nombreEscena(e, i))}</span>
          </label>`).join('')}
      </div>
      <div class="edi-export-acciones">
        <button type="button" class="cuenta-btn-ghost" data-un-archivo>${esc(t('overlayCat.editor.exportarUnArchivo'))}</button>
        <button type="button" class="cuenta-btn-primary" data-separados>${esc(t('overlayCat.editor.exportarSeparados'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  const cerrar = () => overlay.remove();
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrar(); });
  overlay.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrar(); });
  overlay.querySelector('[data-cerrar]').addEventListener('click', cerrar);

  const seleccionadas = () => [...overlay.querySelectorAll('input[type="checkbox"]:checked')].map((c) => Number(c.value));
  const botonUno = overlay.querySelector('[data-un-archivo]');
  const botonSeparados = overlay.querySelector('[data-separados]');
  const actualizarBotones = () => {
    const sinSeleccion = seleccionadas().length === 0;
    botonUno.disabled = sinSeleccion;
    botonSeparados.disabled = sinSeleccion;
  };
  overlay.addEventListener('change', actualizarBotones);
  actualizarBotones();

  botonUno.addEventListener('click', async () => {
    await exportarEscenas(seleccionadas());
    cerrar();
  });
  // Una exportacion por escena: el nombre del archivo ya lo resuelve exportarEscenas con un solo indice.
  botonSeparados.addEventListener('click', async () => {
    for (const indice of seleccionadas()) await exportarEscenas([indice]);
    cerrar();
  });
}
