import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { CATEGORIAS, NOMBRES_PLATAFORMA, OVERLAYS_GENERADOS, PLATAFORMAS_OVERLAY, categoriaDe, logoMonocromo } from './catalogo.js';
import { crearTarjetaOverlay } from './crear-tarjeta.js';
import { iniciarDestacados } from './destacado.js';
import { iniciarTienda } from './tienda.js';

const MODO = { EXPLORAR: 'explorar', TODOS: 'todos', CATEGORIA: 'categoria', TIENDA: 'tienda' };
const SIN_FILTRO = 'todas';
const tarjetas = new Map(); // id de overlay -> .cfg-card
let modo = MODO.EXPLORAR;
let categoriaActual = null;
let filtroPlataforma = SIN_FILTRO;
const $ = (id) => document.getElementById(id);

// Solo ofrece las plataformas que hay en la vista, para que ningun filtro deje la lista vacia.
function pintarFiltro(disponibles) {
  $('ovlFiltro').hidden = disponibles.size < 2;
  document.querySelectorAll('[data-ovl-plataforma]').forEach((chip) => {
    const { ovlPlataforma } = chip.dataset;
    chip.hidden = ovlPlataforma !== SIN_FILTRO && !disponibles.has(ovlPlataforma);
    const activo = ovlPlataforma === filtroPlataforma;
    chip.classList.toggle('activo', activo);
    chip.setAttribute('aria-pressed', String(activo));
  });
}

function pintar() {
  const explorando = modo === MODO.EXPLORAR;
  const enTienda = modo === MODO.TIENDA;
  $('ovlExplorar').hidden = !explorando;
  $('ovlTienda').hidden = !enTienda;
  $('ovlLista').hidden = explorando || enTienda;
  $('ovlDetalle').hidden = modo !== MODO.CATEGORIA;

  const enVista = [...tarjetas.keys()].filter((id) => modo === MODO.TODOS || categoriaDe(id).id === categoriaActual);
  const disponibles = new Set(enVista.flatMap((id) => PLATAFORMAS_OVERLAY[id]));
  pintarFiltro(disponibles);
  for (const [id, tarjeta] of tarjetas) {
    const pasaFiltro = filtroPlataforma === SIN_FILTRO || PLATAFORMAS_OVERLAY[id].includes(filtroPlataforma);
    tarjeta.hidden = !(enVista.includes(id) && pasaFiltro);
  }

  document.querySelectorAll('[data-ovl-modo]').forEach((pestana) => {
    const modoPestana = modo === MODO.CATEGORIA ? MODO.EXPLORAR : modo;
    const activa = pestana.dataset.ovlModo === modoPestana;
    pestana.classList.toggle('activa', activa);
    pestana.setAttribute('aria-pressed', String(activa));
  });
}

function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  categoriaActual = null;
  filtroPlataforma = SIN_FILTRO;
  pintar();
}

function abrirCategoria(id) {
  modo = MODO.CATEGORIA;
  categoriaActual = id;
  filtroPlataforma = SIN_FILTRO;
  $('ovlDetalleTitulo').dataset.i18n = `overlayCat.cat.${id}.titulo`;
  $('ovlDetalleDesc').dataset.i18n = `overlayCat.cat.${id}.desc`;
  aplicarTraducciones($('ovlDetalle'));
  pintar();
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

function crearChipFiltro(plataforma) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'ovl-chip';
  chip.dataset.ovlPlataforma = plataforma;
  if (plataforma === SIN_FILTRO) chip.dataset.i18n = 'overlayCat.todas';
  else chip.innerHTML = `<img src="icons/${plataforma}-logo.svg" alt=""> ${NOMBRES_PLATAFORMA[plataforma]}`;
  chip.addEventListener('click', () => {
    filtroPlataforma = plataforma;
    pintar();
  });
  return chip;
}

function decorarTarjeta(id, tarjeta, pendiente) {
  const logos = document.createElement('span');
  logos.className = 'ovl-plataformas';
  logos.innerHTML = PLATAFORMAS_OVERLAY[id]
    .map((plataforma) => `<span class="ovl-plataforma"><img src="icons/${logoMonocromo(plataforma)}.svg" alt=""> ${NOMBRES_PLATAFORMA[plataforma]}</span>`)
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
  $('ovlFiltro').append(...[SIN_FILTRO, ...Object.keys(NOMBRES_PLATAFORMA)].map(crearChipFiltro));
  $('ovlCategorias').append(...CATEGORIAS.map(crearFilaCategoria));
  iniciarTienda($('ovlTiendaProductos'));
  iniciarDestacados($('ovlDestacado'));
  iniciarDestacados($('ovlTiendaDestacado'));
  aplicarTraducciones($('view-overlays'));

  document.querySelectorAll('[data-ovl-modo]').forEach((pestana) => {
    pestana.addEventListener('click', () => cambiarModo(pestana.dataset.ovlModo));
  });
  $('ovlVolver').addEventListener('click', () => cambiarModo(MODO.EXPLORAR));
  pintar();
}
