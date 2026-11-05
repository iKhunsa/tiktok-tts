import { t } from '../../../nucleo/i18n/i18n.js';

const nombreOverlay = (id) => {
  const clave = `overlayCat.ov.${id}.titulo`;
  const texto = t(clave);
  return texto === clave ? id : texto;
};

/**
 * El .epik se solto en el acordeon de otro overlay: avisa cual es el suyo y ofrece agregarlo alli.
 * Mismo patron que popup-pro.js (.modal-overlay/.modal-content, se destruye al cerrar).
 */
export function abrirPopupOtroOverlay({ nombre, origen, destino, alAgregar }) {
  const fondo = document.createElement('div');
  fondo.className = 'modal-overlay show';
  fondo.innerHTML = `
    <div class="modal-content epik-popup" role="dialog" aria-modal="true" aria-labelledby="epikPopupTitulo">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <div class="notice-icon-badge"><img class="icon-inline" src="icons/extension.svg" alt=""></div>
      <h2 id="epikPopupTitulo"></h2>
      <p class="cuenta-hint"></p>
      <div class="epik-popup-botones">
        <button class="cuenta-btn-ghost" type="button" data-accion="cancelar"></button>
        <button class="cuenta-btn-primary" type="button" data-accion="agregar"></button>
      </div>
    </div>`;
  const destinoTexto = nombreOverlay(destino);
  fondo.querySelector('h2').textContent = t('overlayCfg.epik.otroTitulo');
  fondo.querySelector('p').textContent = t('overlayCfg.epik.otroTexto', { nombre, destino: destinoTexto, origen: nombreOverlay(origen) });
  fondo.querySelector('[data-accion="cancelar"]').textContent = t('overlayCfg.epik.cancelar');
  const agregar = fondo.querySelector('[data-accion="agregar"]');
  agregar.textContent = t('overlayCfg.epik.otroAgregar', { destino: destinoTexto });
  document.body.appendChild(fondo);

  const cerrar = () => { document.removeEventListener('keydown', alTeclear); fondo.remove(); };
  const alTeclear = (evento) => { if (evento.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', alTeclear);
  fondo.addEventListener('click', (evento) => { if (evento.target === fondo) cerrar(); });
  fondo.querySelector('.modal-close').addEventListener('click', cerrar);
  fondo.querySelector('[data-accion="cancelar"]').addEventListener('click', cerrar);
  agregar.addEventListener('click', () => { cerrar(); alAgregar(); });
  agregar.focus();
}
