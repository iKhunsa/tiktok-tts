import { leerEstadoUi, guardarEstadoUi } from '../../../nucleo/estado/estado-ui.js';
import { aplicarTraducciones, t } from '../../../nucleo/i18n/i18n.js';
import { appSettings, saveSettings, alGuardarAjustes } from '../../../nucleo/estado/ajustes-app.js';
import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { crearArrastre, crearBotonesLienzo, formatoActual, pintarLienzos, usarFormatoPropio } from '../lienzo-overlay.js';
import { buildOverlayUrl, fijarPruebaSinTts, probarOverlay, restablecerOverlayDeFabrica, tieneTest, updateOverlayUrl } from '../configurador-overlays.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';
import { CATEGORIAS, NOMBRES_PLATAFORMA, PLATAFORMAS_OVERLAY } from './catalogo.js';
import { alCerrarGif, alMostrarGif, alOcultarGif, iniciarGifBuscador } from '../gif-buscador/index.js';
import { alCerrarSonidos, alMostrarSonidos, alOcultarSonidos, iniciarSonidosBuscador } from '../sonidos-buscador/index.js';
import { moverZ, ordenZ, ponerZ } from './editor-profundidad.js';
import { hacerReordenable } from './reordenar-lista.js';
import { iniciarTiradores } from './editor-redimensionar.js';
import { iniciarEditorGifs } from './editor-gifs.js';
import { crearSeccionGifAlerta } from './gif-alerta-panel.js';
import { crearSeccionSonidoAlerta } from './sonido-alerta-panel.js';
import { esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { idCapaGif, prepararCapaGif } from './gif-capas.js';
import { crearSelectorSkin } from '../selector-skin.js';
import { showToast } from '../../../componentes/toast.js';
import { abrirPopupPro } from '../../../componentes/popup-pro.js';
import { almacenSesion, tieneAccesoPro } from '../../../nucleo/estado/sesion.js';
import { crearMedia } from './media.js';
import { deshacer, rehacer, registrarCambio, reiniciarHistorial } from './editor-historial.js';
import { renderizarTodosLosCamposOverlay } from '../campos-overlay/index.js';

const $ = (id) => document.getElementById(id);
const TODAS = 'todas';
const capas = new Map(); // id de overlay -> { capa, iframe, observador, arrastre, oculta }
let arrastreActivo = null;
let temporizadorResalte = 0;
let zoom = 1; // 1 = el canvas cabe entero en el escenario; Ctrl + rueda lo acerca
const ZOOM_MAX = 8;
let seleccionado = null;
let mano = false; // Espacio pulsado: arrastrar desplaza el lienzo (tras hacer zoom)
let panorama = null; // { x, y, izquierda, arriba } mientras se arrastra con la mano
let categoria = TODAS;
let busqueda = '';
let propiedadesCopiadas = null; // { de, valores }: ajustes copiados con el menu
let escenaActiva = leerEstadoUi().escena || 0; // indice en appSettings.escenas
const SECCIONES = ['editor', 'gif', 'sonido']; // la de GIF esta vacia por ahora
const PESTANAS = ['overlays', 'media', 'gif']; // overlays y gif tienen contenido; media, por ahora no

const tarjetaDe = (id) => document.querySelector(`#ovlTarjetas [data-ovl-id="${id}"]`);
const claveTitulo = (id) => tarjetaDe(id).querySelector('.cfg-title').dataset.i18n;
const claveSubtitulo = (id) => tarjetaDe(id).querySelector('.cfg-subtitle').dataset.i18n;
const icono = (id) => tarjetaDe(id).querySelector('.cfg-icon img').getAttribute('src');
// La URL ya incluye los ajustes: se vuelve a leer cuando el configurador la actualiza.
const urlVistaPrevia = (id) => tarjetaDe(id).querySelector('[data-preview]').dataset.url;
// La profundidad viaja en la URL pero no cambia lo que dibuja el overlay: reordenar no debe recargarlo.
const sinZ = (url) => { const direccion = new URL(url); direccion.searchParams.delete('z'); return direccion.href; };
const orden = () => ordenZ([...capas.keys()]); // de abajo hacia arriba
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function crearBoton(clase, html, alClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = clase;
  boton.innerHTML = html;
  boton.addEventListener('click', alClick);
  return boton;
}

// Los iframes se dibujan a resolucion real (como en OBS) y se reducen al espacio libre.
function ajustar() {
  const { ancho, alto } = formatoActual();
  const escenario = $('ovlEditorEscenario');
  const escala = Math.min(escenario.clientWidth / ancho, escenario.clientHeight / alto) * zoom;
  if (!(escala > 0)) return;
  const marco = $('ovlEditorMarco');
  marco.style.width = `${ancho * escala}px`;
  marco.style.height = `${alto * escala}px`;
  for (const { iframe } of capas.values()) {
    iframe.style.width = `${ancho}px`;
    iframe.style.height = `${alto}px`;
    iframe.style.transform = `scale(${escala})`;
  }
}

function agregar(id) {
  if (capas.has(id)) return;
  const capa = document.createElement('div');
  capa.className = 'edi-capa';
  const iframe = document.createElement('iframe');
  iframe.className = 'edi-iframe';
  iframe.tabIndex = -1;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.src = urlVistaPrevia(id);
  capa.append(iframe);
  const arrastrable = ESQUEMAS[id].some(({ clave }) => clave === 'desplazaX');
  iframe.addEventListener('load', resaltar);
  $('ovlEditorMarco').insertBefore(capa, $('ovlEditorSeleccion'));
  let espera;
  const observador = new MutationObserver(() => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      const estado = capas.get(id);
      const nueva = sinZ(urlVistaPrevia(id));
      // Tras un gesto en vivo el overlay ya esta como dice la URL nueva: se recuerda sin recargar.
      if (estado.yaAplicada) estado.yaAplicada = false;
      else if (nueva !== estado.url) iframe.src = urlVistaPrevia(id);
      estado.url = nueva;
      pintarCapas();
      aplicarOrden();
    }, 300);
  });
  observador.observe(tarjetaDe(id).querySelector('[data-preview]'), { attributes: true, attributeFilter: ['data-url'] });
  capas.set(id, { capa, iframe, observador, url: sinZ(urlVistaPrevia(id)), yaAplicada: false, arrastre: arrastrable ? crearArrastre($('ovlEditorMarco'), iframe, id) : null });
  moverZ([...capas.keys()], id, 'frente'); // el recien llegado queda encima de todo
  aplicarOrden();
  ajustar();
}

// Un overlay es lo que se pinta sobre el fondo transparente de su iframe: se ignora la raiz y los contenedores a pantalla completa.
function esContenido(elemento, ventana) {
  if (!elemento || elemento === elemento.ownerDocument.documentElement || elemento === elemento.ownerDocument.body) return false;
  const { width, height } = elemento.getBoundingClientRect();
  return width < ventana.innerWidth * 0.95 || height < ventana.innerHeight * 0.95;
}

/** La capa mas alta que tiene contenido bajo el puntero (las ocultas y bloqueadas no cuentan); si la seleccionada esta ahi, gana: asi se arrastra aunque otra la tape. */
function capaBajo(evento) {
  const marco = $('ovlEditorMarco').getBoundingClientRect();
  const { ancho } = formatoActual();
  const escala = marco.width / ancho;
  const x = (evento.clientX - marco.left) / escala;
  const y = (evento.clientY - marco.top) / escala;
  return [seleccionado, ...orden().reverse()].find((id) => {
    if (!capas.has(id)) return false;
    const { iframe, oculta } = capas.get(id);
    const ventana = iframe.contentWindow;
    return !oculta && !estaBloqueada(id) && ventana && esContenido(iframe.contentDocument?.elementFromPoint(x, y), ventana); // un iframe aun sin cargar (o roto) no debe romper la seleccion de los demas
  }) ?? null;
}

// Marco alrededor del contenido visible del overlay seleccionado (la capa ocupa todo el lienzo, el overlay no).
function resaltar() {
  const resalte = $('ovlEditorResalte');
  const estado = capas.get(seleccionado);
  resalte.hidden = !estado || estado.oculta;
  if (resalte.hidden) return;
  resalte.classList.toggle('con-tiradores', !estaBloqueada(seleccionado) && ESQUEMAS[seleccionado].some(({ clave }) => clave === 'escala'));
  const { iframe } = estado;
  const ventana = iframe.contentWindow;
  const escala = $('ovlEditorMarco').clientWidth / formatoActual().ancho;
  const cajas = [...(iframe.contentDocument?.body?.querySelectorAll('*') ?? [])]
    .filter((elemento) => esContenido(elemento, ventana)).map((elemento) => elemento.getBoundingClientRect())
    .filter(({ width, height }) => width > 0 && height > 0);
  resalte.hidden = !cajas.length;
  if (resalte.hidden) return;
  const izquierda = Math.min(...cajas.map((caja) => caja.left));
  const arriba = Math.min(...cajas.map((caja) => caja.top));
  Object.assign(resalte.style, {
    left: `${izquierda * escala}px`,
    top: `${arriba * escala}px`,
    width: `${(Math.max(...cajas.map((caja) => caja.right)) - izquierda) * escala}px`,
    height: `${(Math.max(...cajas.map((caja) => caja.bottom)) - arriba) * escala}px`,
  });
}

function soltar(id) {
  const { capa, observador } = capas.get(id);
  observador.disconnect();
  capa.remove(); // quitar el iframe cierra su WebSocket
  capas.delete(id);
}

function quitar(id) {
  if (estaBloqueada(id)) return;
  soltar(id);
  if (seleccionado === id) seleccionar(orden().pop() ?? null);
  else pintar();
}

// El inspector es el panel real del overlay (ajustes, skins, formato): se presta al editor y se devuelve a su tarjeta.
function devolverInspector() {
  const panel = $('ovlEditorPanelCuerpo').querySelector('.ovl-inspector:not(.edi-gif-alerta)');
  panel?.querySelectorAll('.edi-gif-alerta').forEach((seccion) => seccion.remove()); // los acordeones de GIF y sonido son del editor, no de la tarjeta
  if (panel && seleccionado) tarjetaDe(seleccionado).append(panel);
}

// Boton "Cambiar skin" del overlay seleccionado, flotando sobre el lienzo como en la vista de un solo overlay. Se crea
// una vez por overlay y se reutiliza (cada uno se suscribe a los .epik al crearse); solo lo tienen los que tienen skins.
const selectoresSkin = new Map();
function mostrarSelectorSkin(id) {
  const escenario = $('ovlEditorEscenario');
  escenario.querySelectorAll(':scope > .ovl-skin').forEach((selector) => selector.remove());
  if (!id || !ESQUEMAS[id]?.some(({ clave }) => clave === 'skin')) return;
  if (!selectoresSkin.has(id)) selectoresSkin.set(id, crearSelectorSkin(id));
  const selector = selectoresSkin.get(id);
  selector.querySelector('.ovl-skin-boton')?.setAttribute('aria-expanded', 'false');
  escenario.append(selector);
}

function seleccionar(id) {
  devolverInspector();
  seleccionado = id;
  guardarEstadoUi({ capa: id });
  const inspector = id && tarjetaDe(id).querySelector('.ovl-inspector');
  // Las alertas llevan sus acordeones de GIF y de sonido (solo existen en este editor) justo despues de Formato y General.
  const gif = id && crearSeccionGifAlerta(id);
  const sonido = id && crearSeccionSonidoAlerta(id);
  if (gif) {
    const general = inspector.querySelector('[data-grupo="general"]');
    if (general) general.after(gif);
    else inspector.prepend(gif);
    gif.after(sonido);
  }
  $('ovlEditorPanelCuerpo').replaceChildren(...(inspector ? [inspector] : []));
  mostrarSelectorSkin(id);
  pintar();
}

function alternarVisibilidad(id) {
  const estado = capas.get(id);
  estado.oculta = !estado.oculta;
  estado.capa.hidden = estado.oculta;
  pintar();
}

const escena = () => appSettings.escenas[escenaActiva];

// Una capa bloqueada no se arrastra, redimensiona ni borra, y deja pasar los clics a las que tiene debajo: con muchas capas
// apiladas, bloquear las de delante permite alcanzar las de atras. Sigue pudiendose elegir desde la lista de Capas.
const estaBloqueada = (id) => !!escena().bloqueadas?.includes(id);
function alternarBloqueo(id) {
  const actual = escena().bloqueadas ?? [];
  escena().bloqueadas = estaBloqueada(id) ? actual.filter((otra) => otra !== id) : [...actual, id];
  saveSettings();
  pintar();
}

/** Clic en el nombre de una fila ya seleccionada: lo cambia por un campo de texto. Enter guarda, Esc cancela, vacio vuelve al nombre por defecto. */
function renombrar(boton, actual, guardar) {
  const campo = document.createElement('input');
  campo.className = 'edi-renombrar';
  campo.maxLength = 40;
  campo.value = actual;
  let listo = false;
  const terminar = (aplicar) => {
    if (listo) return;
    listo = true;
    if (aplicar) guardar(campo.value.trim());
    pintar();
  };
  campo.addEventListener('keydown', (evento) => {
    evento.stopPropagation(); // Supr/Retroceso/Esc no deben quitar la capa ni cerrar el editor
    if (evento.key === 'Enter') terminar(true);
    else if (evento.key === 'Escape') terminar(false);
  });
  campo.addEventListener('blur', () => terminar(true));
  boton.replaceWith(campo);
  campo.focus();
  campo.select();
}

function nombreCapa(id) {
  const propio = escena().nombres[id];
  const boton = crearBoton('edi-capa-nombre', `<img src="${icono(id)}" alt=""><span ${propio ? '' : `data-i18n="${claveTitulo(id)}"`}></span>`, () => {
    // Clic en la capa ya seleccionada: edita su nombre en la misma fila.
    if (id !== seleccionado) return seleccionar(id);
    renombrar(boton, propio ?? t(claveTitulo(id)), (nombre) => {
      if (nombre) escena().nombres[id] = nombre;
      else delete escena().nombres[id];
      saveSettings();
    });
  });
  if (propio) boton.lastChild.textContent = propio;
  return boton;
}

function filaCapa(id) {
  const { oculta } = capas.get(id);
  const bloqueada = estaBloqueada(id);
  const fila = document.createElement('div');
  fila.className = 'edi-capa-fila';
  fila.classList.toggle('sel', id === seleccionado);
  fila.classList.toggle('oculta', oculta);
  fila.classList.toggle('bloqueada', bloqueada);
  const candado = crearBoton(`edi-icono-boton edi-bloqueo${bloqueada ? ' activo' : ''}`, `<img src="icons/${bloqueada ? 'lock' : 'lock_open'}.svg" alt="">`, () => alternarBloqueo(id));
  candado.dataset.i18nAriaLabel = candado.dataset.i18nTitle = bloqueada ? 'overlayCat.editor.desbloquear' : 'overlayCat.editor.bloquear';
  candado.setAttribute('aria-pressed', String(bloqueada));
  fila.append(
    nombreCapa(id),
    candado,
    crearBoton('edi-icono-boton', `<img src="icons/${oculta ? 'visibility_off' : 'visibility'}.svg" alt="">`, () => alternarVisibilidad(id)),
  );
  fila.addEventListener('contextmenu', (evento) => abrirMenuCapa(evento, id));
  fila.lastChild.dataset.i18nAriaLabel = oculta ? 'overlayCat.editor.mostrar' : 'overlayCat.editor.ocultar';
  return fila;
}

// El apilado real de los iframes sigue a la profundidad guardada.
function aplicarOrden() {
  orden().forEach((id, nivel) => { capas.get(id).capa.style.zIndex = nivel; });
}

function reapilar(id, accion) {
  moverZ([...capas.keys()], id, accion);
  aplicarOrden();
  pintar();
}

// Se comparten los campos de igual clave y tipo (tipografia, tamano, colores...), salvo posicion/profundidad y skin.
const NO_COPIABLES = ['alineacion', 'skin'];
const copiable = (campo) => !NO_COPIABLES.includes(campo.grupo) && campo.tipo !== 'plataformas';

function copiarPropiedades(id) {
  const guardado = appSettings.overlays[id];
  propiedadesCopiadas = { de: id, valores: Object.fromEntries(ESQUEMAS[id].filter(copiable).map(({ clave }) => [clave, window.structuredClone(guardado[clave])])) };
}

function camposPegables(id) {
  if (!propiedadesCopiadas) return [];
  const origen = ESQUEMAS[propiedadesCopiadas.de];
  return ESQUEMAS[id].filter((campo) => {
    const fuente = origen.find(({ clave }) => clave === campo.clave);
    const valor = propiedadesCopiadas.valores[campo.clave];
    return copiable(campo) && fuente?.tipo === campo.tipo && valor !== undefined && (campo.tipo !== 'opcion' || campo.opciones.includes(valor));
  });
}

function pegarPropiedades(id) {
  for (const { clave } of camposPegables(id)) appSettings.overlays[id][clave] = window.structuredClone(propiedadesCopiadas.valores[clave]);
  saveSettings();
  updateOverlayUrl(id);
  sincronizarCamposOverlay(id);
}

// Una capa GIF tiene ajustes propios, asi que se puede clonar; los demas overlays son uno solo por tipo.
function duplicarCapaGif(id) {
  const nueva = idCapaGif(window.crypto.randomUUID().slice(0, 8));
  const copia = window.structuredClone(appSettings.overlays[id]);
  // Un poco desplazada, para que no quede tapando a la original.
  Object.assign(copia, { desplazaX: Math.min(1, (copia.desplazaX ?? 0) + 0.03), desplazaY: Math.min(1, (copia.desplazaY ?? 0) + 0.03) });
  appSettings.overlays[nueva] = copia;
  prepararCapaGif(nueva);
  if (escena().nombres[id]) escena().nombres[nueva] = escena().nombres[id];
  saveSettings();
  agregar(nueva);
  seleccionar(nueva);
}

function opcionesMenu(id) {
  const { oculta } = capas.get(id);
  const bloqueada = estaBloqueada(id);
  const apilado = orden();
  const arriba = apilado.at(-1) === id;
  const abajo = apilado[0] === id;
  return [
    { clave: 'frente', icono: 'flip_to_front', desactivada: arriba, accion: () => reapilar(id, 'frente') },
    { clave: 'subir', icono: 'arrow_upward', desactivada: arriba, accion: () => reapilar(id, 'arriba') },
    { clave: 'bajar', icono: 'arrow_downward', desactivada: abajo, accion: () => reapilar(id, 'abajo') },
    { clave: 'fondo', icono: 'flip_to_back', desactivada: abajo, accion: () => reapilar(id, 'fondo') },
    { clave: oculta ? 'mostrar' : 'ocultar', icono: oculta ? 'visibility' : 'visibility_off', accion: () => alternarVisibilidad(id) },
    { clave: bloqueada ? 'desbloquear' : 'bloquear', icono: bloqueada ? 'lock_open' : 'lock', accion: () => alternarBloqueo(id) },
    { clave: 'copiarProps', icono: 'content_copy', accion: () => copiarPropiedades(id) },
    { clave: 'pegarProps', icono: 'content_paste', desactivada: !camposPegables(id).length || propiedadesCopiadas.de === id, accion: () => pegarPropiedades(id) },
    ...(esCapaGif(id) ? [{ clave: 'duplicar', icono: 'content_copy', accion: () => duplicarCapaGif(id) }] : []),
    { clave: 'restablecer', icono: 'restore', accion: () => restablecerOverlayDeFabrica(id) },
    { clave: 'quitar', icono: 'delete', peligro: true, desactivada: bloqueada, accion: () => quitar(id) },
  ];
}

function cerrarMenu() {
  $('ovlEditorMenu').hidden = true;
}

/** Menu del boton derecho: selecciona la capa y ofrece sus acciones junto al puntero. */
function abrirMenuCapa(evento, id) {
  evento.preventDefault();
  if (id !== seleccionado) seleccionar(id);
  abrirMenu(evento, opcionesMenu(id));
}

function abrirMenu(evento, opciones) {
  evento.preventDefault();
  const menu = $('ovlEditorMenu');
  menu.replaceChildren(...opciones.map(({ clave, icono: nombre, desactivada, peligro, accion }) => {
    const boton = crearBoton(`edi-menu-opcion${peligro ? ' peligro' : ''}`, `<img src="icons/${nombre}.svg" alt=""><span data-i18n="overlayCat.editor.${clave}"></span>`, () => { cerrarMenu(); accion(); });
    boton.disabled = !!desactivada;
    return boton;
  }));
  aplicarTraducciones(menu);
  menu.hidden = false;
  // Se pega al puntero sin salirse de la ventana.
  menu.style.left = `${Math.max(0, Math.min(evento.clientX, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${Math.max(0, Math.min(evento.clientY, window.innerHeight - menu.offsetHeight - 8))}px`;
}

function pintarCapas() {
  const ids = orden().reverse(); // la capa de arriba primero, como en el lienzo
  const vacio = document.createElement('p');
  vacio.className = 'edi-vacio';
  vacio.dataset.i18n = 'overlayCat.editor.capasVacio';
  const filas = ids.map(filaCapa);
  $('ovlEditorCapas').replaceChildren(...(filas.length ? filas : [vacio]));
  // Arrastrar una fila cambia su profundidad: la lista va de arriba (frente) a abajo (fondo).
  hacerReordenable(filas, (desde, hasta) => { ponerZ([...capas.keys()], ids[desde], ids.length - 1 - hasta); aplicarOrden(); pintar(); });
  aplicarTraducciones($('ovlEditorCapas'));
}

// Logos de las redes donde aplica el overlay, para distinguir tarjetas parecidas.
const logosPlataforma = (id) => `<span class="ovl-plataformas">${(PLATAFORMAS_OVERLAY[id] || [])
  .map((p) => `<span class="ovl-plataforma"><img src="icons/${p}-logo.svg" alt="">${NOMBRES_PLATAFORMA[p]}</span>`).join('')}</span>`;

function pintarBiblioteca() {
  document.querySelectorAll('.edi-categoria').forEach((boton) => boton.classList.toggle('activa', boton.dataset.cat === categoria));
  const ids = CATEGORIAS.filter(({ id }) => categoria === TODAS || id === categoria).flatMap(({ overlays }) => overlays);
  const tarjetas = ids.map((id) => crearBoton(
    `edi-tarjeta${capas.has(id) ? ' en-lienzo' : ''}`,
    `<span class="edi-tarjeta-icono"><img src="${icono(id)}" alt=""></span>
     <span class="edi-tarjeta-texto"><strong data-i18n="${claveTitulo(id)}"></strong><span data-i18n="${claveSubtitulo(id)}"></span>${logosPlataforma(id)}</span>`,
    () => { agregar(id); seleccionar(id); },
  ));
  $('ovlEditorOverlays').replaceChildren(...tarjetas);
  aplicarTraducciones($('ovlEditorOverlays'));
  // El filtro mira el texto ya traducido, por eso va despues de aplicar i18n.
  tarjetas.forEach((tarjeta) => { tarjeta.hidden = !normalizar(tarjeta.textContent).includes(busqueda); });
}

// Cada escena recuerda que overlays hay en su canvas; los ajustes de cada overlay son globales.
function pintarEscenas() {
  const { escenas } = appSettings;
  escena().ids = [...capas.keys()];
  saveSettings();
  const filas = escenas.map((__, i) => {
    const fila = document.createElement('div');
    fila.className = `edi-capa-fila${i === escenaActiva ? ' sel' : ''}`;
    const defecto = t('overlayCat.editor.escena', { n: i + 1 });
    // Clic en la escena ya activa: edita su nombre en la misma fila.
    const nombre = crearBoton('edi-capa-nombre', '', () => (i !== escenaActiva
      ? cambiarEscena(i)
      : renombrar(nombre, escenas[i].nombre || defecto, (nuevo) => { escenas[i].nombre = nuevo; saveSettings(); })));
    nombre.textContent = escenas[i].nombre || defecto;
    fila.append(nombre);
    fila.addEventListener('contextmenu', (evento) => abrirMenu(evento, opcionesEscena(i)));
    if (escenas.length > 1) {
      const borrar = crearBoton('edi-icono-boton', '<img src="icons/delete.svg" alt="">', () => eliminarEscena(i));
      borrar.setAttribute('aria-label', t('overlayCat.editor.escenaEliminar'));
      fila.append(borrar);
    }
    return fila;
  });
  $('ovlEditorEscenas').replaceChildren(...filas);
  hacerReordenable(filas, (desde, hasta) => {
    const activa = escenas[escenaActiva];
    escenas.splice(hasta, 0, escenas.splice(desde, 1)[0]);
    escenaActiva = escenas.indexOf(activa); // la escena abierta sigue siendo la misma
    guardarEstadoUi({ escena: escenaActiva });
    pintar();
  });
}

function duplicarEscena(i) {
  const { nombre, ids, nombres, bloqueadas = [], formato } = appSettings.escenas[i];
  appSettings.escenas.splice(i + 1, 0, { id: window.crypto.randomUUID().slice(0, 8), nombre: nombre ? `${nombre} (2)` : '', ids: [...ids], nombres: { ...nombres }, bloqueadas: [...bloqueadas], formato });
  cargarEscena(i + 1);
}

const opcionesEscena = (i) => [
  { clave: 'duplicar', icono: 'content_copy', accion: () => duplicarEscena(i) },
  { clave: 'escenaEliminar', icono: 'delete', peligro: true, desactivada: appSettings.escenas.length < 2, accion: () => eliminarEscena(i) },
];

const nuevaEscena = (ids = []) => ({ id: window.crypto.randomUUID().slice(0, 8), nombre: '', ids, nombres: {}, bloqueadas: [] });

function cargarEscena(i) {
  for (const id of [...capas.keys()]) soltar(id);
  escenaActiva = i;
  guardarEstadoUi({ escena: i });
  // Una capa GIF guardada se rehace desde sus ajustes; si su GIF ya no existe sigue mostrandose roto, como un enlace caducado.
  pintarLienzos();
  appSettings.escenas[i].ids.forEach((id) => { if (prepararCapaGif(id) || (ESQUEMAS[id] && tarjetaDe(id))) agregar(id); });
  seleccionar(null);
  ajustar(); // cada escena puede tener otro formato
}

// Tras deshacer/rehacer: los ajustes ya estan puestos; se repinta el formulario, las URLs y las capas de la escena.
function refrescarDesdeAjustes() {
  const elegido = seleccionado;
  renderizarTodosLosCamposOverlay();
  Object.keys(ESQUEMAS).forEach((id) => { if (tarjetaDe(id)) updateOverlayUrl(id); });
  cargarEscena(Math.min(escenaActiva, appSettings.escenas.length - 1));
  if (elegido && capas.has(elegido)) seleccionar(elegido);
}

function cambiarEscena(i) {
  if (i !== escenaActiva) cargarEscena(i);
}

function eliminarEscena(i) {
  appSettings.escenas.splice(i, 1);
  cargarEscena(Math.min(escenaActiva > i ? escenaActiva - 1 : escenaActiva, appSettings.escenas.length - 1));
}

function pintar() {
  pintarEscenas();
  $('ovlEditorVacio').hidden = !!seleccionado;
  $('ovlEditorQuitar').hidden = !seleccionado;
  $('ovlEditorQuitar').disabled = !!seleccionado && estaBloqueada(seleccionado);
  $('ovlEditorRestablecer').hidden = !seleccionado;
  $('ovlEditorPanelTitulo').dataset.i18n = seleccionado ? claveTitulo(seleccionado) : 'overlayCat.editor.sinSeleccion';
  aplicarTraducciones($('ovlEditorPanel'));
  resaltar();
  aplicarOrden();
  pintarCapas();
  pintarBiblioteca();
}

export function abrirEditorCanvas() {
  // Todo el editor es Pro. Es el unico punto de entrada: lo usan los botones y tambien la restauracion tras una
  // recarga (barra-titulo hace clic en #ovlEditorUnificado). Sin acceso no se entra y no se recuerda como abierto.
  if (!tieneAccesoPro()) {
    guardarEstadoUi({ editor: false });
    abrirPopupPro();
    return;
  }
  usarFormatoPropio({
    leer: () => appSettings.escenas?.[escenaActiva]?.formato,
    guardar: (formato) => { escena().formato = formato; ajustar(); resaltar(); },
  });
  $('ovlEditor').hidden = false;
  document.body.classList.add('edi-abierto');
  // Las escenas eran listas de ids: se pasan al formato { nombre, ids, nombres }.
  if (!Array.isArray(appSettings.escenas) || !appSettings.escenas.length) appSettings.escenas = [nuevaEscena()];
  appSettings.escenas = appSettings.escenas.map((e) => (Array.isArray(e) ? nuevaEscena(e) : { ...nuevaEscena(), ...e }));
  const previo = leerEstadoUi(); // cargarEscena deselecciona: lo que se guardó se lee antes
  guardarEstadoUi({ editor: true });
  alGuardarAjustes(() => { publicarUrlsEscena(); registrarCambio(); });
  saveSettings(); // persiste los ids de escena recien asignados
  cargarEscena(Math.min(escenaActiva, appSettings.escenas.length - 1));
  reiniciarHistorial();
  // Tras una recarga se vuelve a la misma sección y capa.
  if (previo.capa && capas.has(previo.capa)) seleccionar(previo.capa);
  if (previo.seccion && previo.seccion !== SECCIONES[0]) document.querySelectorAll('.edi-seccion')[SECCIONES.indexOf(previo.seccion)]?.click();
  ajustar();
  // Los overlays se rellenan y se animan despues de cargar: el marco sigue su contenido.
  temporizadorResalte = setInterval(resaltar, 500);
}

// Enlace estatico por escena (overlay-escena.html?e=<id>): las URLs de las capas visibles, de abajo hacia arriba,
// se guardan en la escena y la pagina las lee de /api/ajustes-ui, asi el enlace no cambia cuando cambia el contenido.
function publicarUrlsEscena() {
  const e = escena();
  if (e) e.urls = orden().filter((id) => !capas.get(id).oculta).map((id) => { const { pathname, search } = new URL(buildOverlayUrl(id)); return pathname + search; });
}

function copiarEnlaceObs() {
  publicarUrlsEscena();
  if (!escena().urls.length) { showToast(t('overlayCat.editor.copiarObsVacio'), 'error'); return; }
  saveSettings();
  navigator.clipboard.writeText(`${location.origin}/overlay-escena.html?e=${escena().id}`)
    .then(() => showToast(t('toast.urlCopied')))
    .catch(() => showToast(t('toast.copyError'), 'error'));
}

function cerrar() {
  alGuardarAjustes(null);
  zoom = 1;
  usarFormatoPropio(null);
  pintarLienzos();
  cerrarMenu();
  alCerrarGif();
  alCerrarSonidos();
  clearInterval(temporizadorResalte);
  devolverInspector();
  for (const id of [...capas.keys()]) soltar(id);
  seleccionado = null;
  $('ovlEditor').hidden = true;
  $('ovlEditor').dataset.seccion = SECCIONES[0];
  guardarEstadoUi({ editor: false, capa: null, seccion: SECCIONES[0] });
  document.querySelectorAll('.edi-seccion').forEach((boton, i) => boton.classList.toggle('activa', i === 0));
  document.body.classList.remove('edi-abierto');
}

function crearSecciones() {
  $('ovlEditorSecciones').append(...SECCIONES.map((clave) => {
    const boton = crearBoton('edi-seccion', `<span data-i18n="overlayCat.editor.seccion.${clave}"></span>`, () => {
      cerrarMenu();
      $('ovlEditor').dataset.seccion = clave;
      guardarEstadoUi({ seccion: clave });
      // Cada seccion con navegador oculta el suyo al salir (la vista nativa es una sola) y lo reabre al volver.
      if (clave === 'gif') alMostrarGif(); else alOcultarGif();
      if (clave === 'sonido') alMostrarSonidos(); else alOcultarSonidos();
      document.querySelectorAll('.edi-seccion').forEach((otro) => otro.classList.toggle('activa', otro === boton));
    });
    boton.classList.toggle('activa', clave === SECCIONES[0]);
    return boton;
  }));
  aplicarTraducciones($('ovlEditorSecciones'));
}

let media; // se crea en iniciarEditorCanvas: crearMedia() toca el DOM y no debe ejecutarse al importar el modulo

function crearPestanas() {
  document.querySelector('#ovlEditorBiblioteca .edi-biblioteca-cuerpo').append(media.raiz);
  $('ovlEditorPestanas').append(...PESTANAS.map((clave) => {
    const boton = crearBoton('edi-pestana', `<span data-i18n="overlayCat.editor.tab.${clave}"></span>`, () => {
      $('ovlEditorBiblioteca').dataset.pestana = clave;
      if (clave === 'media') media.abrir();
      document.querySelectorAll('.edi-pestana').forEach((otro) => otro.classList.toggle('activa', otro === boton));
    });
    boton.classList.toggle('activa', clave === PESTANAS[0]);
    return boton;
  }));
  aplicarTraducciones($('ovlEditorPestanas'));
}

// Entrada escalonada de las tarjetas (CSS: .edi-entra). Solo al cambiar de categoria: buscar o seleccionar reconstruyen la
// lista muy a menudo y animarlo cada vez cansaria. La clase se quita sola para que esas reconstrucciones no la repitan.
let temporizadorEntrada = 0;
function animarEntrada(contenedor) {
  clearTimeout(temporizadorEntrada);
  contenedor.classList.remove('edi-entra');
  void contenedor.offsetWidth; // reinicia la animacion si se cambia de categoria con otra a medias
  contenedor.classList.add('edi-entra');
  temporizadorEntrada = setTimeout(() => contenedor.classList.remove('edi-entra'), 450);
}

function crearCategorias() {
  const todas = crearBoton('edi-categoria', '<span data-i18n="overlayCat.todas"></span>', () => { categoria = TODAS; pintarBiblioteca(); animarEntrada($('ovlEditorOverlays')); });
  todas.dataset.cat = TODAS;
  $('ovlEditorCategorias').append(todas, ...CATEGORIAS.map(({ id, icono: nombre, color }) => {
    const boton = crearBoton('edi-categoria',
      `<span class="edi-categoria-icono" style="background:${color}"><img src="icons/${nombre}.svg" alt=""></span><span data-i18n="overlayCat.cat.${id}.titulo"></span>`,
      () => { categoria = id; pintarBiblioteca(); animarEntrada($('ovlEditorOverlays')); });
    boton.dataset.cat = id;
    return boton;
  }));
  aplicarTraducciones($('ovlEditorCategorias'));
}

export function iniciarEditorCanvas() {
  const editor = $('ovlEditor');
  media = crearMedia();
  crearCategorias();
  crearSecciones();
  iniciarGifBuscador($('ovlEditorGif'));
  iniciarSonidosBuscador($('ovlEditorSonido'));
  crearPestanas();
  // Pestana GIF: cada GIF de "Mis GIFs" es una capa propia del canvas (clic o arrastrar).
  // La pestana Media usa el mismo mecanismo: cada imagen es una capa gif:m<id> (overlay-gif.html muestra cualquier imagen).
  media.conectar(iniciarEditorGifs({
    contenedor: $('ovlEditorGifs'),
    marco: $('ovlEditorMarco'),
    capaEnLienzo: (id) => capas.has(id),
    nombrarCapa: (id, nombre) => { escena().nombres[id] = nombre; saveSettings(); },
    agregarCapa: (id) => { agregar(id); seleccionar(id); },
  }));
  iniciarTiradores($('ovlEditorResalte'), {
    idSeleccionado: () => seleccionado,
    iframeDe: (id) => capas.get(id).iframe,
    alMover: resaltar,
    alConfirmar: (id) => { capas.get(id).yaAplicada = true; },
  });
  // Escenas y Capas se pliegan al pulsar su titulo (el CSS oculta la lista que sigue).
  document.querySelectorAll('.edi-acordeon').forEach((titulo) => titulo.addEventListener('click', (evento) => {
    if (evento.target.closest('button')) return;
    titulo.setAttribute('aria-expanded', String(titulo.getAttribute('aria-expanded') !== 'true'));
  }));
  $('ovlEditorEscenaNueva').addEventListener('click', () => { $('ovlEditorEscenas').previousElementSibling.setAttribute('aria-expanded', 'true'); appSettings.escenas.push(nuevaEscena()); cargarEscena(appSettings.escenas.length - 1); });
  $('ovlEditorPlegar').addEventListener('click', () => {
    const plegada = $('ovlEditorBiblioteca').classList.toggle('plegada');
    $('ovlEditorPlegar').setAttribute('aria-expanded', String(!plegada));
    ajustar(); // el canvas gana (o devuelve) el alto de la biblioteca
  });
  $('ovlEditorCopiarObs').addEventListener('click', copiarEnlaceObs);
  // El formato de la escena se elige aqui mismo, con los mismos botones del panel derecho.
  document.querySelector('.edi-herramientas').prepend(crearBotonesLienzo());
  // Desde GIF/Sonidos la flecha vuelve primero al editor de canvas; ya en él, cierra.
  $('ovlEditorCerrar').addEventListener('click', () => {
    if ($('ovlEditor').dataset.seccion !== SECCIONES[0]) document.querySelector('.edi-seccion').click();
    else cerrar();
  });
  $('ovlEditorRestablecer').addEventListener('click', () => restablecerOverlayDeFabrica(seleccionado));
  $('ovlEditorQuitar').addEventListener('click', () => quitar(seleccionado));
  $('ovlEditorSinTts').addEventListener('click', (evento) => {
    const boton = evento.currentTarget;
    const activo = boton.getAttribute('aria-pressed') !== 'true';
    boton.setAttribute('aria-pressed', String(activo));
    boton.querySelector('img').src = activo ? 'icons/volume_off.svg' : 'icons/volume_up.svg';
    fijarPruebaSinTts(activo);
  });
  // Prueba de toda la escena: el evento de ejemplo de cada capa visible que lo tenga (se ve en el canvas y en OBS).
  $('ovlEditorProbarEscena').addEventListener('click', () => {
    const probables = orden().filter((id) => !capas.get(id).oculta && tieneTest(id));
    if (!probables.length) showToast(t('overlayCat.editor.probarEscenaVacio'), 'error');
    probables.forEach((id) => probarOverlay(id));
  });
  $('ovlEditorBuscar').addEventListener('input', (evento) => { busqueda = normalizar(evento.target.value.trim()); pintarBiblioteca(); });
  const superficie = $('ovlEditorSeleccion');
  superficie.addEventListener('pointerdown', (evento) => {
    // Mano (Espacio) o boton central: se arrastra el lienzo en vez de seleccionar o mover una capa.
    if (mano || evento.button === 1) {
      evento.preventDefault();
      const escenario = $('ovlEditorEscenario');
      panorama = { x: evento.clientX, y: evento.clientY, izquierda: escenario.scrollLeft, arriba: escenario.scrollTop };
      superficie.setPointerCapture(evento.pointerId);
      escenario.classList.add('edi-mano-arrastrando');
      return;
    }
    if (evento.button !== 0) return;
    const id = capaBajo(evento);
    if (id !== seleccionado) seleccionar(id);
    arrastreActivo = id && capas.get(id).arrastre;
    if (!arrastreActivo) return;
    superficie.setPointerCapture(evento.pointerId);
    arrastreActivo.iniciar(evento);
  });
  superficie.addEventListener('pointermove', (evento) => {
    if (panorama) {
      $('ovlEditorEscenario').scrollLeft = panorama.izquierda - (evento.clientX - panorama.x);
      $('ovlEditorEscenario').scrollTop = panorama.arriba - (evento.clientY - panorama.y);
      return;
    }
    arrastreActivo?.mover(evento); if (arrastreActivo) resaltar();
  });
  superficie.addEventListener('contextmenu', (evento) => {
    const id = capaBajo(evento);
    if (id) abrirMenuCapa(evento, id);
    else evento.preventDefault();
  });
  const terminar = () => {
    if (panorama) {
      panorama = null;
      $('ovlEditorEscenario').classList.remove('edi-mano-arrastrando');
      resaltar();
      return;
    }
    if (arrastreActivo?.soltar()) capas.get(seleccionado).yaAplicada = true;
    arrastreActivo = null;
    setTimeout(resaltar, 500);
  };
  superficie.addEventListener('pointerup', terminar);
  superficie.addEventListener('pointercancel', terminar);
  // El formato 16:9 / 9:16 vive en el inspector: tras cambiarlo se reajusta el lienzo.
  editor.addEventListener('click', (evento) => { if (evento.target.closest('[data-lienzo]')) setTimeout(ajustar); });
  const botonesEntrada = document.querySelectorAll('.ovl-banner-cta, #ovlEditorUnificado');
  botonesEntrada.forEach((boton) => boton.addEventListener('click', abrirEditorCanvas));
  // Sin Pro los botones de entrada se ven deshabilitados (candado) pero siguen siendo clicables: abren el popup de
  // Pro. Si el editor estaba abierto cuando se sabe que no hay acceso (la sesion se hidrata despues de arrancar, o
  // el plan vence), se cierra.
  const pintarAcceso = () => {
    const acceso = tieneAccesoPro();
    botonesEntrada.forEach((boton) => {
      boton.classList.toggle('bloqueado-pro', !acceso);
      boton.setAttribute('aria-disabled', String(!acceso));
      const candado = boton.querySelector('.ovl-candado-pro');
      if (acceso) candado?.remove();
      else if (!candado) {
        const icono = document.createElement('img');
        icono.className = 'icon-inline ovl-candado-pro';
        icono.src = 'icons/lock.svg';
        icono.alt = '';
        boton.append(icono);
      }
    });
    if (!acceso && !editor.hidden) cerrar();
  };
  almacenSesion.subscribe(pintarAcceso);
  pintarAcceso();
  new window.ResizeObserver(ajustar).observe($('ovlEditorEscenario'));
  // Ctrl + rueda: zoom hacia el puntero (el marco crece de verdad, asi seleccion y tiradores siguen midiendo bien). Sin Ctrl, la rueda desplaza.
  $('ovlEditorEscenario').addEventListener('wheel', (evento) => {
    if (!evento.ctrlKey) return;
    evento.preventDefault();
    const marco = $('ovlEditorMarco');
    const antes = marco.getBoundingClientRect();
    const fx = (evento.clientX - antes.left) / antes.width;
    const fy = (evento.clientY - antes.top) / antes.height;
    zoom = Math.min(ZOOM_MAX, Math.max(1, zoom * Math.exp(-evento.deltaY * 0.002)));
    ajustar();
    const despues = marco.getBoundingClientRect();
    $('ovlEditorEscenario').scrollLeft += despues.left + fx * despues.width - evento.clientX;
    $('ovlEditorEscenario').scrollTop += despues.top + fy * despues.height - evento.clientY;
    resaltar();
  }, { passive: false });
  // Pantalla completa: solo el escenario (el ResizeObserver de arriba reescala el lienzo); Esc la cierra.
  const pantallaCompleta = $('ovlEditorPantallaCompleta');
  pantallaCompleta.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else $('ovlEditorEscenario').requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    pantallaCompleta.querySelector('img').src = `icons/${document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}.svg`;
  });
  const ponerMano = (activa) => { mano = activa; $('ovlEditorEscenario').classList.toggle('edi-mano', activa); };
  document.addEventListener('keyup', (evento) => { if (evento.code === 'Space') ponerMano(false); });
  window.addEventListener('blur', () => ponerMano(false));
  // Cualquier clic fuera del menu, o Esc, lo cierra; con el menu cerrado Esc sale del editor.
  document.addEventListener('pointerdown', (evento) => { if (!evento.target.closest('#ovlEditorMenu')) cerrarMenu(); });
  document.addEventListener('keydown', (evento) => {
    if (editor.hidden || editor.dataset.seccion !== 'editor' || document.querySelector('.modal-overlay.show')) return;
    const escribiendo = evento.target.closest('input, textarea, select, [contenteditable]');
    if (evento.code === 'Space' && !escribiendo) {
      evento.preventDefault(); // sin esto Espacio pulsaria el boton enfocado
      ponerMano(true);
      return;
    }
    if (!escribiendo && (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'z') {
      evento.preventDefault();
      cerrarMenu();
      (evento.shiftKey ? rehacer : deshacer)(refrescarDesdeAjustes);
      return;
    }
    if (!escribiendo && (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'y') {
      evento.preventDefault();
      rehacer(refrescarDesdeAjustes);
      return;
    }
    if ((evento.key === 'Delete' || evento.key === 'Backspace') && seleccionado && !escribiendo) {
      if (estaBloqueada(seleccionado)) return;
      evento.preventDefault();
      cerrarMenu();
      quitar(seleccionado);
    } else if (seleccionado && !escribiendo && evento.ctrlKey && (evento.key === 'ArrowUp' || evento.key === 'ArrowDown')) {
      // Ctrl+flecha sube o baja un nivel; con Mayus va al frente o al fondo.
      evento.preventDefault();
      const sube = evento.key === 'ArrowUp';
      reapilar(seleccionado, evento.shiftKey ? (sube ? 'frente' : 'fondo') : (sube ? 'arriba' : 'abajo'));
    } else if (evento.key === 'Escape' && !document.fullscreenElement) {
      if ($('ovlEditorMenu').hidden) cerrar();
      else cerrarMenu();
    }
  });
}
