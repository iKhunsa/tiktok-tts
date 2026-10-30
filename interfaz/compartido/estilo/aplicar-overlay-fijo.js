import { aplicarAlineacion } from './aplicar-alineacion.js';
import { aplicarTipografia } from './aplicar-tipografia.js';
import { ESQUEMAS } from './esquemas.js';
import { FUENTE_SISTEMA } from './fuentes.js';
import { leerConfig } from './query.js';

const EJE_H = { izquierda: 'flex-start', centro: 'center', derecha: 'flex-end' };

/**
 * Arranque de los overlays de diseno fijo: dibujados a su medida base, se escalan
 * enteros segun la fuente de OBS, sin deformarse. A la medida base se ven a tamano real.
 */
export function iniciarOverlayFijo(tipo, anchoBase, altoBase) {
  const cfg = leerConfig(ESQUEMAS[tipo], new URLSearchParams(location.search));
  const raiz = document.documentElement.style;
  const { classList } = document.body;

  aplicarTipografia(cfg, anchoBase);
  aplicarAlineacion(cfg);
  raiz.setProperty('--pos-x', EJE_H[cfg.posicionH]);
  raiz.setProperty('--u', '1px'); // el zoom ya escala todo: --u lo escalaria dos veces
  classList.add('overlay-fijo');
  classList.toggle('fijar-fuente', cfg.fuente !== FUENTE_SISTEMA);
  classList.toggle('fijar-peso', cfg.peso !== 'auto');
  classList.toggle('fijar-caso', cfg.mayusculas !== 'none');
  classList.toggle('fijar-ls', cfg.espaciadoLetras !== 0);

  const ajustar = () => {
    const { innerWidth: ancho, innerHeight: alto } = window;
    // En un lienzo completo la tarjeta no debe llenar la escena: en 1920 x 1080 crece 1,5 veces, como el chat.
    const tope = Math.max(1, ancho > alto ? alto / 720 : ancho / 480);
    const escala = Math.min(ancho / anchoBase, alto / altoBase, tope);
    if (escala > 0) raiz.setProperty('--zoom', String(escala * cfg.escala));
  };
  window.addEventListener('resize', ajustar);
  ajustar();
}
