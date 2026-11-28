import { crearNieve } from '../../componentes/temporada/nieve.js';

/**
 * Ilustracion a ventana completa detras del contenido del panel. La imagen tapa la nieve de la ventana, asi que el panel
 * lleva la suya: cae entre el fondo y las piezas (ver `.temporada-con-fondo` en temporada.css).
 */
export function ponerFondo(panel, src) {
  panel.classList.add('temporada-con-fondo');
  crearNieve(panel);
  panel.insertAdjacentHTML('afterbegin', `<img class="temporada-escena temporada-escena-centrada" src="${src}" alt="">`);
}
