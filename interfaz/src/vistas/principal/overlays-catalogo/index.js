import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { iniciarMenuSelect } from '../../../componentes/menu-select.js';
import { DEFAULTS_OVERLAYS } from '../../../../compartido/estilo/esquemas.js';
import { restablecerOverlayDeFabrica } from '../configurador-overlays.js';
import { fijarAbierta } from '../overlays-tarjetas.js';
import { CATEGORIAS, NOMBRES_PLATAFORMA, OVERLAYS_GENERADOS, PLATAFORMAS_OVERLAY, categoriaDe } from './catalogo.js';
import { crearTarjetaOverlay } from './crear-tarjeta.js';
import { iniciarDestacados } from './destacado.js';
import { iniciarTienda } from './tienda.js';

const MODO = { EXPLORAR: 'explorar', TODOS: 'todos', CATEGORIA: 'categoria', OVERLAY: 'overlay', TIENDA: 'tienda' };
const SIN_FILTRO = 'todas';
const MAX_ESCALON = 6; // las tarjetas siguientes entran a la vez, para no hacer esperar en listas largas
const tarjetas = new Map(); // id de overlay -> .cfg-card
let modo = MODO.EXPLORAR;
let categoriaActual = null;
let overlayActual = null;
let filtroPlataforma = SIN_FILTRO;
let busqueda = '';
const $ = (id) => document.getElementById(id);

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function coincideBusqueda(tarjeta) {
  if (!busqueda) return true;
  const texto = ['.cfg-title', '.cfg-subtitle'].map((selector) => tarjeta.querySelector(selector).textContent).join(' ');
  return normalizar(texto).includes(busqueda);
}

// Solo ofrece las plataformas que hay en la vista, para que ningun filtro deje la lista vacia.
function pintarFiltro(disponibles) {
  const select = $('ovlPlataforma');
  select.hidden = disponibles.size < 2;
  select.value = filtroPlataforma;
  [...select.options].forEach((opcion) => {
    opcion.hidden = opcion.value !== SIN_FILTRO && !disponibles.has(opcion.value);
  });
}

function limpiarFiltros() {
  filtroPlataforma = SIN_FILTRO;
  busqueda = '';
  $('ovlBuscar').value = '';
}

function pintar() {
  const explorando = modo === MODO.EXPLORAR;
  const enTienda = modo === MODO.TIENDA;
  $('ovlExplorar').hidden = !explorando;
  $('ovlTienda').hidden = !enTienda;
  $('ovlLista').hidden = explorando || enTienda;
  const enOverlay = modo === MODO.OVERLAY;
  document.querySelector('.ovl-controles').hidden = enOverlay;
  $('ovlDetalle').hidden = modo !== MODO.CATEGORIA && !enOverlay;
  $('ovlBusqueda').hidden = modo !== MODO.CATEGORIA;
  $('ovlReiniciar').hidden = !enOverlay || !DEFAULTS_OVERLAYS[overlayActual];

  const enVista = enOverlay
    ? [overlayActual]
    : [...tarjetas.keys()].filter((id) => modo === MODO.TODOS || categoriaDe(id).id === categoriaActual);
  pintarFiltro(enOverlay ? new Set() : new Set(enVista.flatMap((id) => PLATAFORMAS_OVERLAY[id])));
  let posicion = 0;
  for (const [id, tarjeta] of tarjetas) {
    const pasaFiltro = filtroPlataforma === SIN_FILTRO || PLATAFORMAS_OVERLAY[id].includes(filtroPlataforma);
    tarjeta.hidden = !(enVista.includes(id) && pasaFiltro && coincideBusqueda(tarjeta));
    if (!tarjeta.hidden) tarjeta.style.setProperty('--ovl-i', Math.min(posicion++, MAX_ESCALON));
    // En TODOS manda el tutorial, que abre las tarjetas que necesita.
    if (modo !== MODO.TODOS) fijarAbierta(tarjeta, id === overlayActual && enOverlay);
  }
  $('ovlSinResultados').hidden = modo !== MODO.CATEGORIA || posicion > 0;

  document.querySelectorAll('[data-ovl-modo]').forEach((pestana) => {
    const modoPestana = modo === MODO.CATEGORIA || modo === MODO.OVERLAY ? MODO.EXPLORAR : modo;
    const activa = pestana.dataset.ovlModo === modoPestana;
    pestana.classList.toggle('activa', activa);
    pestana.setAttribute('aria-pressed', String(activa));
  });
}

function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  categoriaActual = null;
  limpiarFiltros();
  pintar();
}

function abrirCategoria(id) {
  modo = MODO.CATEGORIA;
  categoriaActual = id;
  limpiarFiltros();
  $('ovlDetalleTitulo').dataset.i18n = `overlayCat.cat.${id}.titulo`;
  $('ovlDetalleDesc').dataset.i18n = `overlayCat.cat.${id}.desc`;
  aplicarTraducciones($('ovlDetalle'));
  pintar();
}

function abrirOverlay(id) {
  abrirCategoria(categoriaDe(id).id);
  modo = MODO.OVERLAY;
  overlayActual = id;
  const tarjeta = tarjetas.get(id);
  $('ovlDetalleTitulo').dataset.i18n = tarjeta.querySelector('.cfg-title').dataset.i18n;
  $('ovlDetalleDesc').dataset.i18n = tarjeta.querySelector('.cfg-subtitle').dataset.i18n;
  aplicarTraducciones($('ovlDetalle'));
  pintar();
  $('view-overlays').scrollIntoView({ block: 'start' });
}

function alElegirTarjeta(evento) {
  if (evento.type === 'keydown' && evento.key !== 'Enter' && evento.key !== ' ') return;
  const cabecera = evento.target.closest('.cfg-header');
  if (!cabecera || modo === MODO.OVERLAY) return;
  evento.preventDefault();
  abrirOverlay(cabecera.closest('.cfg-card').dataset.ovlId);
}

function crearFilaCategoria({ id, icono, color, overlays }) {
  const fila = document.createElement('button');
  fila.type = 'button';
  fila.className = 'ovl-fila';
  fila.innerHTML = `
    <span class="ovl-fila-icono" style="background:${color}"><img src="icons/${icono}.svg" alt=""></span>
    <span class="ovl-fila-texto">
      <span class="ovl-fila-titulo" data-i18n="overlayCat.cat.${id}.titulo"></span>
      <span class="ovl-fila-desc" data-i18n="overlayCat.cat.${id}.desc"></span>
    </span>
    <span class="ovl-fila-cuenta">${overlays.length}</span>
    <img class="ovl-fila-flecha" src="icons/chevron_right.svg" alt="">`;
  fila.addEventListener('click', () => abrirCategoria(id));
  return fila;
}

function crearOpcionPlataforma(plataforma) {
  const opcion = document.createElement('option');
  opcion.value = plataforma;
  if (plataforma === SIN_FILTRO) opcion.dataset.i18n = 'overlayCat.todas';
  else opcion.textContent = NOMBRES_PLATAFORMA[plataforma];
  return opcion;
}

function decorarTarjeta(id, tarjeta, pendiente) {
  const logos = document.createElement('span');
  logos.className = 'ovl-plataformas';
  logos.innerHTML = PLATAFORMAS_OVERLAY[id]
    .map((plataforma) => `<span class="ovl-plataforma"><img src="icons/${plataforma}-logo.svg" alt=""> ${NOMBRES_PLATAFORMA[plataforma]}</span>`)
    .join('');
  tarjeta.querySelector('.cfg-subtitle').after(logos);
  if (!pendiente) return;
  const aviso = document.createElement('span');
  aviso.className = 'ovl-proximamente';
  aviso.dataset.i18n = 'overlayCat.proximamente';
  tarjeta.querySelector('.obs-hint').before(aviso);
}

function montarTarjetas() {
  const lista = $('ovlTarjetas');
  const generados = new Map(OVERLAYS_GENERADOS.map((overlay) => [overlay.id, overlay]));
  for (const { overlays } of CATEGORIAS) {
    for (const id of overlays) {
      const generado = generados.get(id);
      const tarjeta = generado
        ? crearTarjetaOverlay(generado)
        : document.querySelector(`[data-preview="${id}"]`).closest('.cfg-card');
      tarjeta.dataset.ovlId = id;
      decorarTarjeta(id, tarjeta, generado?.pendiente);
      lista.append(tarjeta); // tambien ordena las estaticas segun el catalogo
      tarjetas.set(id, tarjeta);
    }
  }
}

/** Para el tutorial: muestra la lista completa, donde estan sus elementos. */
export function mostrarTodosLosOverlays() {
  cambiarModo(MODO.TODOS);
}

/** Crea las tarjetas nuevas y la navegacion. Debe correr antes de applySettings, que las rellena. */
export function iniciarCatalogoOverlays() {
  montarTarjetas();
  $('ovlPlataforma').append(...[SIN_FILTRO, ...Object.keys(NOMBRES_PLATAFORMA)].map(crearOpcionPlataforma));
  iniciarMenuSelect($('ovlPlataforma'), $('ovlBusqueda'));
  $('ovlPlataforma').addEventListener('change', (evento) => {
    filtroPlataforma = evento.target.value;
    pintar();
  });
  $('ovlBuscar').addEventListener('input', (evento) => {
    busqueda = normalizar(evento.target.value.trim());
    pintar();
  });
  $('ovlCategorias').append(...CATEGORIAS.map(crearFilaCategoria));
  iniciarTienda($('ovlTiendaProductos'));
  iniciarDestacados($('ovlDestacado'));
  iniciarDestacados($('ovlTiendaDestacado'));
  aplicarTraducciones($('view-overlays'));

  document.querySelectorAll('[data-ovl-modo]').forEach((pestana) => {
    pestana.addEventListener('click', () => cambiarModo(pestana.dataset.ovlModo));
  });
  // El menu lateral siempre lleva a la portada, no al ultimo overlay editado.
  document.querySelector('.sidebar-item[data-view="overlays"]').addEventListener('click', () => cambiarModo(MODO.EXPLORAR));
  $('ovlVolver').addEventListener('click', () => {
    if (modo === MODO.OVERLAY) abrirCategoria(categoriaActual);
    else cambiarModo(MODO.EXPLORAR);
  });
  $('ovlReiniciarSi').addEventListener('click', () => {
    $('ovlReiniciarPopup').hidePopover();
    restablecerOverlayDeFabrica(overlayActual);
  });
  $('ovlTarjetas').addEventListener('click', alElegirTarjeta);
  $('ovlTarjetas').addEventListener('keydown', alElegirTarjeta);
  pintar();
}
