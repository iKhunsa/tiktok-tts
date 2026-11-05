import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteMusica, idDeCancion as idDe, segundosDe } from './compartido/fuente-musica.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { avatarGenerado } from './compartido/avatar-generado.js';

// Medida base de cada skin (ancho x alto): el zoom la encaja en la fuente de OBS.
const MEDIDAS = { vinilo: [420, 152], widgetPequeno: [220, 220], widgetMediano: [440, 200], widgetGrande: [320, 360] };
const [anchoBase, altoBase] = MEDIDAS[new URLSearchParams(location.search).get('skin')] ?? [420, 124];
const cfg = iniciarOverlayFijo('musica', anchoBase, altoBase);
registrarErroresOverlay();

const params = leerParametros();
const vistaPrevia = esVistaPrevia(params);
// demo=1 (popup de la tienda): una sola cancion de ejemplo, quieta hasta que el popup la reproduce.
const demo = vistaPrevia && params.get('demo') === '1';
aplicarParametrosVisuales(params);

const { classList } = document.body;
classList.toggle('portada-derecha', cfg.ladoPortada === 'derecha');
classList.toggle('sin-barra', !cfg.mostrarBarra);
classList.toggle('sin-tiempos', !cfg.mostrarTiempos);
classList.toggle('sin-etiqueta', !cfg.mostrarEtiqueta);
classList.add(`largo-${cfg.textoLargo}`);
const ALINEAR = { izquierda: 'left', centro: 'center', derecha: 'right' };
document.documentElement.style.setProperty('--pedido-align', ALINEAR[cfg.alineacionPedido]);
if (cfg.colorTexto !== '#ffffff') document.documentElement.style.setProperty('--txt-color', cfg.colorTexto);

const $ = (id) => document.getElementById(id);
const tarjeta = $('tarjeta');
const portada = $('portada');
const ICONO_SIN_PORTADA = 'icons/music_note.svg';
const movimientoReducido = () => classList.contains('reduce-motion');

let cancionActual = null;
let cola = [];
const MAX_COLA = 3;
let idActual = null;
// { position, duration, paused, recibido }: la posicion se interpola desde `recibido`.
let progreso = null;

const formatear = (segundos) => `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, '0')}`;

function pintarProgreso() {
  const total = progreso?.duration || segundosDe(cancionActual?.duration);
  $('progreso').hidden = !cancionActual || !total;
  if (!total) return;
  const avance = progreso ? progreso.position + (progreso.paused ? 0 : (Date.now() - progreso.recibido) / 1000) : 0;
  const posicion = Math.min(Math.max(avance, 0), total);
  $('relleno').style.transform = `scaleX(${posicion / total})`;
  $('transcurrido').textContent = formatear(posicion);
  $('total').textContent = formatear(total);
  classList.toggle('pausada', !!progreso?.paused);
  sincronizarVideo(posicion, !!progreso?.paused);
}

// Video mudo en lugar de la portada: el audio sale de la app, el video solo sigue su posicion.
const video = $('video');
const cajaPortada = $('portadaCaja');
const REINTENTO_VIDEO_MS = 8000;
const DESFASE_MAX_S = 1.5;
let videoDe = null;
let reintentoVideo = null;

const urlVideo = (videoId) => `/api/music/video?videoId=${videoId}&t=${Date.now()}`;

function cargarVideo(cancion) {
  clearTimeout(reintentoVideo);
  cajaPortada.classList.remove('con-video');
  videoDe = cfg.mostrarVideo ? cancion?.videoId || null : null;
  if (videoDe) video.src = cancion.video || urlVideo(videoDe); // la muestra trae su video local
  else video.removeAttribute('src');
}

// Mientras el servidor lo descarga responde 404: se queda la portada y se reintenta.
video.addEventListener('error', () => {
  const pendiente = videoDe;
  if (pendiente) reintentoVideo = setTimeout(() => { if (videoDe === pendiente) video.src = urlVideo(pendiente); }, REINTENTO_VIDEO_MS);
});
video.addEventListener('loadeddata', () => cajaPortada.classList.add('con-video'));

function sincronizarVideo(posicion, pausada) {
  if (!cajaPortada.classList.contains('con-video')) return;
  if (Math.abs(video.currentTime - posicion) > DESFASE_MAX_S) video.currentTime = posicion;
  if (pausada) video.pause();
  else if (video.paused) video.play().catch(() => {});
}

function recibirProgreso(datos) {
  if (!datos || datos.videoId !== idDe(cancionActual)) return;
  progreso = { ...datos, recibido: Date.now() };
  pintarProgreso();
}

function pintarCola() {
  $('siguientes').hidden = !cfg.mostrarCola || !cola.length;
  $('cola').replaceChildren(...cola.slice(0, MAX_COLA).map((cancion) => {
    const fila = document.createElement('li');
    const portadaFila = document.createElement(cancion.thumbnail ? 'img' : 'span');
    if (cancion.thumbnail) { portadaFila.src = cancion.thumbnail; portadaFila.alt = ''; }
    const textos = document.createElement('div');
    const titulo = document.createElement('b');
    titulo.textContent = cancion.title || '';
    const artista = document.createElement('small');
    artista.textContent = cancion.channelName || cancion.channel || '';
    textos.append(titulo, artista);
    fila.append(portadaFila, textos);
    return fila;
  }));
}

function recibirCola(nueva) {
  cola = nueva;
  pintarCola();
}

const PX_POR_SEGUNDO = 40;

// El texto va en un span para poder desplazarlo; .desborda solo si no cabe (con lo que falta como recorrido).
function escribir(elemento, texto) {
  const span = document.createElement('span');
  span.textContent = texto;
  elemento.replaceChildren(...(texto ? [span] : [])); // vacio, :empty lo oculta
  const sobra = elemento.scrollWidth - elemento.clientWidth;
  elemento.classList.toggle('desborda', sobra > 1);
  elemento.style.setProperty('--recorrido', `${-sobra}px`);
  elemento.style.setProperty('--recorrido-s', `${Math.max(4, sobra / PX_POR_SEGUNDO + 2)}s`);
}

// Foto de quien la pidio; las URLs de TikTok/YouTube caducan, entonces el avatar generado de su nombre.
function pintarPedido({ requestedBy, requestedByAvatar }) {
  const pedido = $('pedido');
  if (!cfg.mostrarPedido || !requestedBy) return pedido.replaceChildren(); // vacio, :empty lo oculta
  const texto = document.createTextNode(t('overlayCat.musicaPedida', { user: requestedBy }));
  if (!cfg.avatarPedido) return pedido.replaceChildren(texto);
  const foto = document.createElement('img');
  foto.alt = '';
  const generado = avatarGenerado(requestedBy);
  foto.src = requestedByAvatar || generado;
  foto.addEventListener('error', () => { foto.src = generado; }, { once: true });
  pedido.replaceChildren(foto, texto);
}

// Escala cada esquina de la skin (algunas son asimetricas) por el redondeo elegido.
function aplicarRedondeo() {
  if (cfg.redondeo === 1) return;
  const estilo = window.getComputedStyle(tarjeta);
  const esquinas = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
    .map((esquina) => `${(parseFloat(estilo[esquina]) || 0) * cfg.redondeo}px`);
  document.documentElement.style.setProperty('--radio-tarjeta', esquinas.join(' '));
  classList.add('redondeo-propio');
}
aplicarRedondeo();

function rellenar(cancion) {
  escribir($('titulo'), cancion.title || '');
  escribir($('detalle'), cancion.channelName || cancion.channel || '');
  pintarPedido(cancion);
  portada.src = cancion.thumbnail || ICONO_SIN_PORTADA;
  portada.classList.toggle('miniatura', !!cancion.thumbnail);
  portada.onerror = () => { portada.onerror = null; portada.src = ICONO_SIN_PORTADA; portada.classList.remove('miniatura'); };
  cargarVideo(cancion);
}

function entrar() {
  tarjeta.className = 'tarjeta';
  if (cfg.animacionEntrada === 'ninguna' || movimientoReducido()) return;
  void tarjeta.offsetWidth; // reinicia la animacion si la clase es la misma
  tarjeta.classList.add(`anim-${cfg.animacionEntrada}`);
}

// Sale la tarjeta anterior (si habia) y entra la nueva con las animaciones elegidas.
function salirYLuego(alTerminar) {
  if (tarjeta.hidden || cfg.animacionSalida === 'ninguna' || movimientoReducido()) return alTerminar();
  tarjeta.className = `tarjeta ${cfg.animacionSalida}`;
  tarjeta.addEventListener('animationend', alTerminar, { once: true });
}

function pintarCancion(cancion, progresoInicial) {
  const id = idDe(cancion);
  if (id === idActual) return recibirProgreso(progresoInicial);
  idActual = id;
  salirYLuego(() => {
    if (idDe(cancion) !== idActual) return; // llego otra mientras salia
    cancionActual = cancion;
    // Hasta el primer aviso de la app se cuenta desde que llego la cancion.
    progreso = { position: 0, duration: 0, paused: false, recibido: Date.now() };
    tarjeta.hidden = !cancion;
    if (!cancion) return cargarVideo(null); // sin cancion no queda un video bajando de fondo
    rellenar(cancion);
    recibirProgreso(progresoInicial);
    pintarProgreso();
    entrar();
  });
}

const aplicarA11y = iniciarAccesibilidadOverlay();
setInterval(pintarProgreso, 500);

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  iniciarFuenteMusica({ vistaPrevia, demo, alCancion: pintarCancion, alProgreso: recibirProgreso, alCola: recibirCola, alConfig: aplicarA11y });
});
