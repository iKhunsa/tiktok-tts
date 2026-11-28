import { SKINS_PREMIUM } from '../../../../compartido/estilo/campos-chat.js';
import { SKINS_RANKING_PREMIUM } from '../../../../compartido/estilo/campos-ranking.js';
import { SKINS_MUSICA_PREMIUM } from '../../../../compartido/estilo/campos-musica.js';
import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { overlayComprado } from '../../../nucleo/estado/compras-overlays.js';
import { arteSkin } from '../../../componentes/arte-skin.js';
import { ponerFondo } from '../poner-fondo.js';
import { PRECIO_OVERLAY } from '../precio-overlay.js';
import { verOverlay } from '../ver-overlay.js';
import { nuevoPanel } from './nuevo-panel.js';

// Por el momento, los mismos overlays que la tienda de overlays de la app, una pagina por categoria. `overlay` es donde
// se ve la skin en la vista previa.
const PAGINAS = [
  { titulo: 'overlayCat.cat.musica.titulo', overlay: 'musica', skins: SKINS_MUSICA_PREMIUM },
  { titulo: 'overlayCat.cat.chat.titulo', overlay: 'chat', skins: SKINS_PREMIUM },
  { titulo: 'overlayCfg.tipoSkin.ranking', overlay: 'likes', skins: SKINS_RANKING_PREMIUM },
];

const htmlEstado = (skin) => (overlayComprado(skin)
  ? '<span class="temporada-carta-estado is-comprado" data-i18n="temporada.tienda.adquirido"></span>'
  : `<span class="temporada-carta-estado"><span class="temporada-moneda" aria-hidden="true"></span>${PRECIO_OVERLAY}</span>`);

const htmlCarta = (skin, indice) => `<button type="button" class="temporada-carta" style="--i:${indice}" data-skin-carta="${skin}">
  <span class="temporada-carta-arte" aria-hidden="true">${arteSkin(skin)}</span>
  <strong data-i18n="overlayCfg.skins.${skin}"></strong>${htmlEstado(skin)}</button>`;

/** Shop: los overlays por categorias; tocar uno abre su muestra en vivo para comprarlo con monedas. */
export function crearPanelTienda() {
  const panel = nuevoPanel('temporada-tienda');
  panel.innerHTML = `
    <h2 class="temporada-categoria" aria-live="polite"></h2>
    <div class="temporada-cartas"></div>
    <div class="temporada-paginador">
      <button type="button" class="temporada-pagina-flecha" data-delta="-1" data-i18n-aria-label="temporada.tienda.anterior"></button>
      <span class="temporada-pagina-cuenta" data-cuenta></span>
      <button type="button" class="temporada-pagina-flecha temporada-pagina-sig" data-delta="1" data-i18n-aria-label="temporada.tienda.siguiente"></button>
    </div>`;
  ponerFondo(panel, 'img/eventos/winter/shop.webp');
  const categoria = panel.querySelector('.temporada-categoria');
  const cartas = panel.querySelector('.temporada-cartas');
  let activa = 0;

  function pintar() {
    const { titulo, skins } = PAGINAS[activa];
    categoria.dataset.i18n = titulo;
    cartas.innerHTML = skins.map(htmlCarta).join('');
    panel.querySelector('[data-cuenta]').textContent = `${activa + 1}/${PAGINAS.length}`;
    panel.querySelectorAll('[data-delta]').forEach((flecha) => {
      const destino = activa + Number(flecha.dataset.delta);
      flecha.disabled = destino < 0 || destino >= PAGINAS.length;
    });
    aplicarTraducciones(panel);
  }

  panel.addEventListener('click', (evento) => {
    const flecha = evento.target.closest('[data-delta]');
    const carta = evento.target.closest('[data-skin-carta]');
    if (flecha) {
      activa += Number(flecha.dataset.delta);
      pintar();
    } else if (carta) {
      const { titulo, overlay } = PAGINAS[activa];
      verOverlay({ skin: carta.dataset.skinCarta, overlay, seccion: titulo }, pintar);
    }
  });
  pintar();
  return panel;
}
