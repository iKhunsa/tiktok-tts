import { t } from '../../nucleo/i18n/i18n.js';
import { anotarCompra, overlayComprado } from '../../nucleo/estado/compras-overlays.js';
import { abrirVistaPrevia } from '../../componentes/vista-previa-producto.js';
import { avisarSinMonedas } from './avisar-sin-monedas.js';
import { mostrarAviso } from './mostrar-aviso.js';
import { gastarMonedas } from './saldo.js';
import { PRECIO_OVERLAY } from './precio-overlay.js';

/** Cobra el overlay, lo anota (la ventana principal lo suma a sus skins) y lo confirma. */
function comprar({ skin, seccion }, alComprar) {
  if (!gastarMonedas(PRECIO_OVERLAY)) {
    avisarSinMonedas(PRECIO_OVERLAY, 'temporada.aviso.sinMonedasOverlay');
    return;
  }
  anotarCompra(skin);
  alComprar();
  mostrarAviso({
    titulo: 'temporada.tienda.compradoTitulo',
    texto: 'temporada.tienda.compradoTexto',
    vars: { skin: t(`overlayCfg.skins.${skin}`), categoria: t(seccion) },
    acciones: [{ clave: 'temporada.tienda.listo' }],
  });
}

/**
 * Popup de un overlay: su muestra en vivo (la misma de la tienda de la app) y la compra con monedas.
 * @param {{ skin: string, overlay: string, seccion: string }} producto
 * @param {() => void} alComprar repinta las cartas
 */
export function verOverlay(producto, alComprar) {
  const comprado = overlayComprado(producto.skin);
  const estado = comprado ? 'temporada.tienda.adquirido' : 'temporada.tienda.comprar';
  const dialogo = abrirVistaPrevia(producto, { claveAccion: estado, clavePrecio: 'temporada.tienda.adquirido', alAccionar: () => comprar(producto, alComprar) });
  dialogo.querySelector('.ovl-vista-accion').disabled = comprado;
  if (comprado) dialogo.querySelector('.ovl-vista-cerrar').focus(); // el foco no se queda en un boton apagado
  const precio = dialogo.querySelector('.ovl-vista-precio');
  if (!comprado) {
    precio.removeAttribute('data-i18n');
    precio.innerHTML = `<span class="temporada-moneda" aria-hidden="true"></span>${PRECIO_OVERLAY}`;
  }
}
