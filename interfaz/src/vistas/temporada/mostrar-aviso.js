import { aplicarTraducciones, t } from '../../nucleo/i18n/i18n.js';

const htmlAccion = ({ clave }, indice) => `<button type="button" class="${indice === 0 ? 'ruleta-girar' : 'aviso-secundaria'}" data-accion="${indice}" data-i18n="${clave}"></button>`;

/**
 * Aviso emergente de la ventana de temporada: titulo, explicacion y acciones (la primera es la principal). Es un
 * <dialog> nativo: atrapa el foco, Esc lo cierra y un clic fuera tambien.
 * @param {{ titulo: string, texto: string, vars?: object, acciones: Array<{ clave: string, alPulsar?: () => void }> }} aviso
 */
export function mostrarAviso({ titulo, texto, vars, acciones }) {
  if (document.querySelector('dialog.aviso')) return;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'aviso';
  dialogo.setAttribute('aria-labelledby', 'avisoTitulo');
  dialogo.setAttribute('aria-describedby', 'avisoTexto');
  dialogo.innerHTML = `
    <div class="aviso-cuerpo">
      <span class="temporada-moneda" aria-hidden="true"></span>
      <h2 id="avisoTitulo" data-i18n="${titulo}"></h2>
      <p id="avisoTexto"></p>
      <div class="aviso-acciones">${acciones.map(htmlAccion).join('')}</div>
    </div>`;
  aplicarTraducciones(dialogo);
  dialogo.querySelector('p').textContent = t(texto, vars);
  dialogo.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-accion]');
    if (!boton && evento.target !== dialogo) return;
    dialogo.close();
    acciones[boton?.dataset.accion]?.alPulsar?.();
  });
  dialogo.addEventListener('close', () => dialogo.remove());
  document.body.append(dialogo);
  dialogo.showModal();
}
