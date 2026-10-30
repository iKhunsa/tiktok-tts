import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

const HUECOS_VACIOS = 8;

/**
 * Productos de la tienda. Para agregar uno: { id, nombre, precio: '4,99 US$', imagen: 'ruta' }.
 * Mientras este vacia se dibujan huecos "Proximamente" para ver la rejilla.
 */
const PRODUCTOS = [];

function crearTarjeta(producto) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'ovl-producto';

  const arte = document.createElement('div');
  arte.className = 'ovl-producto-arte';
  if (producto?.imagen) {
    const imagen = document.createElement('img');
    imagen.src = producto.imagen;
    imagen.alt = '';
    arte.append(imagen);
  } else {
    arte.innerHTML = '<span class="ovl-producto-molde"><i></i><i></i><i></i></span>';
  }

  const nombre = document.createElement('div');
  nombre.className = 'ovl-producto-nombre';
  if (producto) nombre.textContent = producto.nombre;
  else nombre.dataset.i18n = 'overlayCat.proximamente';

  const precio = document.createElement('div');
  precio.className = 'ovl-producto-precio';
  precio.textContent = producto?.precio || '—';

  const comprar = document.createElement('button');
  comprar.type = 'button';
  comprar.className = 'ovl-producto-comprar';
  if (producto) comprar.textContent = t('overlayCat.comprarPor', { precio: producto.precio });
  else comprar.dataset.i18n = 'overlayCat.comprar';
  // Sin backend de compras: el boton solo avisa, nunca cobra.
  comprar.addEventListener('click', () => showToast(t('overlayCat.proximamente')));

  const pie = document.createElement('div');
  pie.className = 'ovl-producto-pie';
  pie.append(nombre, precio, comprar);

  tarjeta.append(arte, pie);
  return tarjeta;
}

/** Rejilla de productos de la pestaña Tienda. */
export function iniciarTienda(contenedor) {
  const productos = PRODUCTOS.length ? PRODUCTOS : Array(HUECOS_VACIOS).fill(null);
  contenedor.append(...productos.map(crearTarjeta));
  aplicarTraducciones(contenedor);
}
