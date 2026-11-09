import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { almacenSesion, tieneAccesoPro } from '../../../nucleo/estado/sesion.js';
import { showToast } from '../../../componentes/toast.js';
import { abrirPopupPro } from '../../../componentes/popup-pro.js';
import { irACheckout } from '../cuenta/checkout.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { MAX_FAVORITAS, SKINS_PREMIUM, alternarFavorita } from '../../../../compartido/estilo/campos-chat.js';
import { SKINS_RANKING_PREMIUM } from '../../../../compartido/estilo/campos-ranking.js';
import { SKINS_MUSICA_PREMIUM } from '../../../../compartido/estilo/campos-musica.js';
import { aplicarSkin } from '../campos-overlay/index.js';
import { abrirVistaPrevia } from './vista-previa-producto.js';
import { arteSkin } from './arte-skin.js';

// overlay = donde se ve la skin en la vista previa.
const productos = (delTipo, overlay, seccion) => delTipo.map((skin) => ({ skin, delTipo, overlay, seccion }));

/** Secciones de la tienda. */
const SECCIONES = [
  { titulo: 'overlayCat.cat.musica.titulo', productos: productos(SKINS_MUSICA_PREMIUM, 'musica', 'overlayCat.cat.musica.titulo') },
  { titulo: 'overlayCat.cat.chat.titulo', productos: productos(SKINS_PREMIUM, 'chat', 'overlayCat.cat.chat.titulo') },
  { titulo: 'overlayCfg.tipoSkin.ranking', productos: productos(SKINS_RANKING_PREMIUM, 'likes', 'overlayCfg.tipoSkin.ranking') },
];

// Con el sistema de cuentas apagado, la app funciona toda desbloqueada.
export const tieneAcceso = tieneAccesoPro;

/** Lleva directo al pago del plan Pro; sin sesion, primero a iniciarla. */
export function comprarPro(boton) {
  if (almacenSesion.getState().signedIn) irACheckout(boton);
  else window.switchView('cuenta');
}

// Sin Pro la estrella lleva a comprar; con Pro guarda la skin en la pagina de favoritas del selector.
function crearEstrella({ skin, delTipo }) {
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
    const lista = alternarFavorita(appSettings.skinsFavoritas, skin, delTipo);
    if (!lista) return showToast(t('overlayCfg.favoritasMaximo', { max: MAX_FAVORITAS }));
    appSettings.skinsFavoritas = lista;
    saveSettings();
    estrella.pintar();
  });
  return estrella;
}

function crearTarjeta(producto, alIrAOverlay) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'ovl-producto';

  const arte = document.createElement('button');
  arte.type = 'button';
  arte.className = 'ovl-producto-arte';
  arte.dataset.i18nAriaLabel = 'overlayCat.verVistaPrevia';
  arte.innerHTML = arteSkin(producto.skin);

  const nombre = document.createElement('div');
  nombre.className = 'ovl-producto-nombre';
  nombre.dataset.i18n = `overlayCfg.skins.${producto.skin}`;

  const precio = document.createElement('div');
  precio.className = 'ovl-producto-precio';

  const accion = document.createElement('button');
  accion.type = 'button';
  accion.className = 'ovl-producto-comprar';
  const accionar = (boton) => {
    if (!tieneAcceso()) comprarPro(boton);
    else usar(producto, estrella);
  };
  accion.addEventListener('click', () => accionar(accion));

  const pie = document.createElement('div');
  pie.className = 'ovl-producto-pie';
  pie.append(nombre, precio, accion);

  tarjeta.append(arte, pie);
  const estrella = crearEstrella(producto);
  tarjeta.append(estrella);
  // Clic en la tarjeta (no en sus botones) abre la vista previa; el arte es el boton para el teclado.
  tarjeta.addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (boton && boton !== arte) return;
    abrirVistaPrevia(producto, { claveAccion: accion.dataset.i18n, alAccionar: accionar, alIrAOverlay });
  });
  tarjeta.pintarAcceso = () => {
    const acceso = tieneAcceso();
    tarjeta.classList.toggle('incluido', acceso);
    accion.dataset.i18n = acceso ? 'overlayCat.usar' : 'overlayCat.comprar';
    precio.dataset.i18n = 'overlayCat.incluidoPro';
    estrella.pintar();
  };
  return tarjeta;
}

// Usar = la skin queda en favoritas y puesta en todos los overlays que la admiten.
function usar({ skin, delTipo }, estrella) {
  const favoritas = appSettings.skinsFavoritas || [];
  if (!favoritas.includes(skin)) {
    const lista = alternarFavorita(favoritas, skin, delTipo);
    if (lista) appSettings.skinsFavoritas = lista;
    else showToast(t('overlayCfg.favoritasMaximo', { max: MAX_FAVORITAS }));
  }
  aplicarSkin(skin); // guarda los ajustes, favoritas incluidas
  estrella.pintar();
  showToast(t('overlayCat.skinAplicada', { skin: t(`overlayCfg.skins.${skin}`) }));
}

function crearSeccion({ titulo, productos }, alIrAOverlay) {
  const seccion = document.createElement('section');
  seccion.className = 'ovl-tienda-seccion';
  const encabezado = document.createElement('h3');
  encabezado.dataset.i18n = titulo;
  const rejilla = document.createElement('div');
  rejilla.className = 'ovl-productos';
  const tarjetas = productos.map((producto) => crearTarjeta(producto, alIrAOverlay));
  rejilla.append(...tarjetas);
  seccion.append(encabezado, rejilla);
  return { seccion, tarjetas };
}

/** Rejillas por categoria de la pestaña Explorar. Comprar lleva al plan Pro, que los incluye todos. */
export function iniciarTienda(contenedor, alIrAOverlay) {
  const secciones = SECCIONES.map((seccion) => crearSeccion(seccion, alIrAOverlay));
  contenedor.append(...secciones.map(({ seccion }) => seccion));
  const tarjetas = secciones.flatMap((s) => s.tarjetas);
  const pintar = () => {
    tarjetas.forEach((tarjeta) => tarjeta.pintarAcceso());
    aplicarTraducciones(contenedor);
  };
  pintar();
  almacenSesion.subscribe(pintar); // la sesion se hidrata despues de arrancar y puede cambiar de plan
  // Los ajustes (y sus favoritas) se cargan despues de montar la tienda.
  document.querySelector('[data-ovl-modo="tienda"]').addEventListener('click', pintar);
}
