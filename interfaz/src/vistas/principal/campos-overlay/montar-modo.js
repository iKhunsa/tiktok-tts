import { t } from '../../../nucleo/i18n/i18n.js';
import { prefiereMovimientoReducido } from '../../../componentes/eventos/movimiento-reducido.js';
import { crearInterruptorModo, marcarModo } from './interruptor-modo.js';
import { BASICOS_POR_OVERLAY, guardarModo, leerModo, tieneModos } from './modos.js';

const inspectorDe = (overlay) => document.querySelector(`[data-campos-base="${overlay}"]`)?.closest('.ovl-inspector');
const campoDe = (overlay, clave) => document.querySelector(`[data-cfg-overlay="${overlay}"][data-cfg-clave="${clave}"]:not([data-cfg-plataforma])`)?.closest('.cfg-field');

// Donde estaba cada campo antes de pasar a la lista basica, para devolverlo a su sitio en el avanzado.
const huecos = new WeakMap();

function crearTexto(clase, i18n) {
  const parrafo = document.createElement('p');
  parrafo.className = clase;
  parrafo.dataset.i18n = i18n;
  parrafo.textContent = t(i18n);
  return parrafo;
}

function crearBoton(i18n, alPulsar) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cfg-btn';
  boton.dataset.i18n = i18n;
  boton.textContent = t(i18n);
  boton.addEventListener('click', alPulsar);
  return boton;
}

function crearTarjetaMasControl() {
  const tarjeta = document.createElement('div');
  tarjeta.className = 'cfg-modo-tarjeta';
  tarjeta.append(
    crearTexto('cfg-modo-tarjeta-titulo', 'overlayCfg.modo.masControl'),
    crearTexto('cfg-modo-tarjeta-texto', 'overlayCfg.modo.masControlTexto'),
    crearBoton('overlayCfg.modo.pasarAvanzado', () => cambiarModo('avanzado', { desde: tarjeta })),
  );
  return tarjeta;
}

function crearEnlaceVolver() {
  const contenedor = document.createElement('div');
  contenedor.className = 'cfg-modo-volver';
  contenedor.dataset.modoUi = '';
  const boton = crearBoton('overlayCfg.modo.volverBasico', () => cambiarModo('basico', { desde: contenedor }));
  boton.classList.add('cfg-modo-volver-boton');
  contenedor.append(boton);
  return contenedor;
}

// Los campos basicos se MUEVEN (no se copian) a la lista; el hueco que dejan lo marca un comentario.
function llevarCamposALista(overlay, lista) {
  const tarjeta = lista.lastElementChild;
  for (const clave of BASICOS_POR_OVERLAY[overlay]) {
    const campo = campoDe(overlay, clave);
    if (!campo || lista.contains(campo)) continue;
    const hueco = document.createComment(clave);
    campo.before(hueco);
    huecos.set(campo, hueco);
    tarjeta.before(campo);
  }
}

function devolverCamposAlSitio(lista) {
  for (const campo of [...lista.querySelectorAll('.cfg-field')]) huecos.get(campo)?.replaceWith(campo);
}

/** Muestra el modo en el overlay: el basico reune sus campos en una lista, el avanzado los devuelve a los acordeones. */
export function aplicarModo(overlay, modo) {
  const inspector = inspectorDe(overlay);
  const lista = inspector?.querySelector(':scope > .cfg-basico');
  if (!lista) return;
  inspector.dataset.modo = modo;
  if (modo === 'basico') llevarCamposALista(overlay, lista);
  else devolverCamposAlSitio(lista);
  inspector.querySelectorAll('.cfg-modo').forEach((interruptor) => marcarModo(interruptor, modo));
}

// Al cambiar de modo se vuelve al inicio del panel; sin movimiento si la persona lo pidio.
function llevarAlInicio(inspector) {
  const behavior = prefiereMovimientoReducido() ? 'auto' : 'smooth';
  if (inspector.scrollHeight > inspector.clientHeight) inspector.scrollTo({ top: 0, behavior });
  else inspector.scrollIntoView({ block: 'start', behavior }); // ventana angosta: el que se desplaza es el contenido
}

/** Cambia el modo en todos los overlays que lo tienen (es una preferencia global) y lo recuerda. */
export function cambiarModo(modo, { desde, enfocar } = {}) {
  guardarModo(modo);
  Object.keys(BASICOS_POR_OVERLAY).forEach((overlay) => aplicarModo(overlay, modo));
  const inspector = desde?.closest('.ovl-inspector');
  if (!inspector) return;
  if (enfocar) inspector.querySelector(`.cfg-modo [data-modo-editor="${modo}"]`)?.focus();
  llevarAlInicio(inspector);
}

/**
 * Anade al inspector de la tarjeta lo propio del modo (interruptor, lista basica, enlace para volver) y aplica el
 * modo guardado. Se llama tras montar los campos; los overlays sin modos no cambian.
 */
export function montarModo(overlay) {
  const inspector = inspectorDe(overlay);
  if (!inspector || !tieneModos(overlay)) return;
  inspector.querySelectorAll('[data-modo-ui]').forEach((elemento) => elemento.remove());

  const interruptor = crearInterruptorModo((modo, opciones) => cambiarModo(modo, { desde: interruptor, ...opciones }));
  const lista = document.createElement('div');
  lista.className = 'cfg-basico cfg-fields';
  lista.dataset.modoUi = '';
  lista.append(crearTarjetaMasControl());

  inspector.prepend(interruptor);
  inspector.querySelector('[data-grupo="general"]').before(lista);
  inspector.append(crearEnlaceVolver());
  aplicarModo(overlay, leerModo());
}
