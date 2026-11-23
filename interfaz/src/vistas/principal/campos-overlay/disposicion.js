import { esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { renderizarCamposOverlay } from './index.js';
import { crearSeccionGeneral } from './seccion-general.js';

/**
 * El inspector de un overlay es un solo elemento que la tarjeta presta al editor unificado (canvas). Los acordeones y el
 * modo basico son de la tarjeta ('tarjeta'); mientras el editor lo tiene, vuelve a verse como antes ('clasico').
 * Re-monta los mismos campos con la otra disposicion: nada se duplica y los valores salen de los ajustes guardados.
 */
export function fijarDisposicion(overlay, disposicion) {
  if (esCapaGif(overlay)) return; // las capas GIF siempre usan el panel clasico
  const base = document.querySelector(`[data-campos-base="${overlay}"]`);
  const inspector = base?.closest('.ovl-inspector');
  const general = base?.closest('[data-grupo="general"]');
  if (!inspector || !general || inspector.dataset.disposicion === disposicion) return;
  inspector.dataset.disposicion = disposicion;
  delete inspector.dataset.modo; // el modo basico solo pinta en la tarjeta (montarModo lo vuelve a poner)
  inspector.querySelectorAll('[data-modo-ui]').forEach((elemento) => elemento.remove());
  general.replaceWith(crearSeccionGeneral(base, disposicion));
  renderizarCamposOverlay(overlay);
}
