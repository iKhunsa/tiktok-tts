import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { almacenSesion } from '../../../nucleo/estado/sesion.js';
import { showToast } from '../../../componentes/toast.js';
import { abrirPopupPro } from '../../../componentes/popup-pro.js';
import { irACheckout } from '../cuenta/checkout.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { MAX_FAVORITAS, SKINS_PREMIUM, alternarFavorita } from '../../../../compartido/estilo/campos-chat.js';

const HUECOS_VACIOS = 8;

/** Por ahora la tienda ofrece estilos de chat; el resto de huecos dibuja "Proximamente". */
const PRODUCTOS = SKINS_PREMIUM.map((skin) => ({ skin }));

// Con el sistema de cuentas apagado, la app funciona toda desbloqueada.
export function tieneAcceso() {
  const { activo, plan } = almacenSesion.getState();
  return !activo || plan === 'pro';
}

/** Lleva directo al pago del plan Pro; sin sesion, primero a iniciarla. */
export function comprarPro(boton) {
  if (almacenSesion.getState().signedIn) irACheckout(boton);
  else window.switchView('cuenta');
}

// Sin Pro la estrella lleva a comprar; con Pro guarda la skin en la pagina de favoritas del selector.
function crearEstrella(skin) {
  const estrella = document.createElement('button');
  estrella.type = 'button';
  estrella.className = 'ovl-producto-estrella';
  estrella.dataset.i18nTitle = 'overlayCfg.marcarFavorita';
  estrella.dataset.i18nAriaLabel = 'overlayCfg.marcarFavorita';
  const icono = document.createElement('img');
  icono.alt = '';
  estrella.append(icono);
  estrella.pintar = () => {
    const activa = (appSettings.skinsFavoritas || []).includes(skin);
    estrella.setAttribute('aria-pressed', String(activa));
    icono.src = activa ? 'icons/star.svg' : 'icons/star_border.svg';
  };
  estrella.addEventListener('click', () => {
    if (!tieneAcceso()) return abrirPopupPro();
    const lista = alternarFavorita(appSettings.skinsFavoritas, skin);
    if (!lista) return showToast(t('overlayCfg.favoritasMaximo', { max: MAX_FAVORITAS }));
    appSettings.skinsFavoritas = lista;
    saveSettings();
    estrella.pintar();
  });
  return estrella;
}

function crearTarjeta(producto) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'ovl-producto';

  const arte = document.createElement('div');
  arte.className = 'ovl-producto-arte';
  if (producto) {
    arte.innerHTML = `<span class="ovl-skin-miniatura" data-skin="${producto.skin}"><i></i><i></i></span>`;
  } else {
    arte.innerHTML = '<span class="ovl-producto-molde"><i></i><i></i><i></i></span>';
  }

  const nombre = document.createElement('div');
  nombre.className = 'ovl-producto-nombre';
  nombre.dataset.i18n = producto ? `overlayCfg.skins.${producto.skin}` : 'overlayCat.proximamente';

  const precio = document.createElement('div');
  precio.className = 'ovl-producto-precio';

  const accion = document.createElement('button');
  accion.type = 'button';
  accion.className = 'ovl-producto-comprar';
  accion.addEventListener('click', () => {
    if (!tieneAcceso()) comprarPro(accion);
    else if (!producto) showToast(t('overlayCat.proximamente'));
  });

  const pie = document.createElement('div');
  pie.className = 'ovl-producto-pie';
  pie.append(nombre, precio, accion);

  tarjeta.append(arte, pie);
  const estrella = producto && crearEstrella(producto.skin);
  if (estrella) tarjeta.append(estrella);
  tarjeta.pintarAcceso = () => {
    const acceso = tieneAcceso();
    tarjeta.classList.toggle('incluido', acceso);
    accion.dataset.i18n = acceso ? 'overlayCat.usar' : 'overlayCat.comprar';
    tarjeta.classList.toggle('con-estrella', acceso && !!producto);
    if (acceso || producto) precio.dataset.i18n = 'overlayCat.incluidoPro';
    else {
      delete precio.dataset.i18n;
      precio.textContent = '—';
    }
    estrella?.pintar();
  };
  return tarjeta;
}

/** Rejilla de productos de la pestaña Explorar. Comprar lleva al plan Pro, que los incluye todos. */
export function iniciarTienda(contenedor) {
  const productos = [...PRODUCTOS, ...Array(Math.max(0, HUECOS_VACIOS - PRODUCTOS.length)).fill(null)];
  const tarjetas = productos.map(crearTarjeta);
  contenedor.append(...tarjetas);
  const pintar = () => {
    tarjetas.forEach((tarjeta) => tarjeta.pintarAcceso());
    aplicarTraducciones(contenedor);
  };
  pintar();
  almacenSesion.subscribe(pintar); // la sesion se hidrata despues de arrancar y puede cambiar de plan
  // Los ajustes (y sus favoritas) se cargan despues de montar la tienda.
  document.querySelector('[data-ovl-modo="tienda"]').addEventListener('click', pintar);
}
