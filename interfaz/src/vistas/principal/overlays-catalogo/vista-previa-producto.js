import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { urlConVistaPrevia } from '../../../../compartido/vista-previa.js';
import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { construirQuery } from '../../../../compartido/estilo/query.js';
import { MUESTRAS_MUSICA } from '../../../../compartido/muestras-vista-previa.js';
import { arteSkin } from './arte-skin.js';

// Ajustes de fabrica + la skin, centrado en la escena: los del usuario (posicion, ancho) estan pensados para 1920 px y aqui se cortan.
// El de musica va en modo demo: la cancion de ejemplo solo suena si le dan a Escuchar.
// Con los presets de la skin, para que se vea como queda al elegirla.
// En la tienda la musica se luce entera: con su video, quien la pidio y los minutos, sea cual sea la skin.
const DEMO_MUSICA = { mostrarVideo: true, mostrarPedido: true, mostrarTiempos: true };

function urlEjemplo({ skin, overlay }) {
  const esquema = ESQUEMAS[overlay];
  const presets = esquema.find(({ clave }) => clave === 'skin')?.presets;
  const query = construirQuery(esquema, { skin, posicionH: 'centro', posicionV: 'centro', ...(presets?.[skin] ?? presets?.base), ...(overlay === 'musica' ? DEMO_MUSICA : {}) });
  return urlConVistaPrevia(`${location.origin}/overlay-${overlay}.html?${query}${overlay === 'musica' ? '&demo=1' : ''}`);
}

const VOLUMEN_DEMO = 0.5;

/** Boton Escuchar del overlay de musica: reproduce la cancion de ejemplo y le pasa su progreso al overlay. */
function crearReproductor(iframe) {
  const [cancion] = MUESTRAS_MUSICA;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'ovl-vista-play';
  const icono = document.createElement('img');
  icono.alt = '';
  boton.append(icono);
  let audio = null;

  const pintar = () => {
    const sonando = audio && !audio.paused;
    icono.src = sonando ? 'icons/pause.svg' : 'icons/play_arrow.svg';
    const texto = t(sonando ? 'overlayCat.pausar' : 'overlayCat.escuchar');
    boton.title = texto;
    boton.setAttribute('aria-label', texto);
  };
  const avisar = () => {
    iframe.contentWindow?.postMessage({
      type: 'music-progress', videoId: cancion.videoId, position: audio.currentTime,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0, paused: audio.paused,
    }, location.origin);
    pintar();
  };
  boton.addEventListener('click', () => {
    if (!audio) {
      audio = new Audio(cancion.audio);
      audio.volume = VOLUMEN_DEMO;
      ['playing', 'pause', 'seeked', 'ended'].forEach((evento) => audio.addEventListener(evento, avisar));
    }
    if (audio.paused) audio.play().catch(pintar);
    else audio.pause();
  });
  pintar();
  // Al cerrar el popup se corta la cancion.
  boton.detener = () => { audio?.pause(); audio?.removeAttribute('src'); };
  return boton;
}

/** Popup al estilo de la tienda de Discord: ficha a la izquierda, overlay en vivo a la derecha. */
export function abrirVistaPrevia(producto, { claveAccion, alAccionar, alIrAOverlay }) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'ovl-vista';
  dialogo.setAttribute('aria-labelledby', 'ovlVistaNombre');
  dialogo.innerHTML = `
    <div class="ovl-vista-ficha">
      <div class="ovl-vista-arte">${arteSkin(producto.skin)}</div>
      <h2 id="ovlVistaNombre" data-i18n="overlayCfg.skins.${producto.skin}"></h2>
      <p class="ovl-vista-tipo" data-i18n="${producto.seccion}"></p>
      <p class="ovl-vista-precio" data-i18n="overlayCat.incluidoPro"></p>
      <div class="ovl-vista-botones">
        <button class="ovl-vista-accion" type="button" data-i18n="${claveAccion}"></button>
        <button class="ovl-vista-atajo" type="button" data-i18n-aria-label="overlayCat.irAlOverlay" data-i18n-title="overlayCat.irAlOverlay"><img src="icons/layers.svg" alt=""></button>
      </div>
    </div>
    <div class="ovl-vista-escena">
      <iframe title="" src="${urlEjemplo(producto)}"></iframe>
      <button class="ovl-vista-cerrar" type="button" data-i18n-aria-label="overlayCat.cerrar" data-i18n-title="overlayCat.cerrar"><img src="icons/close.svg" alt=""></button>
    </div>`;
  aplicarTraducciones(dialogo);
  const iframe = dialogo.querySelector('iframe');
  iframe.title = t(`overlayCfg.skins.${producto.skin}`);
  const reproductor = producto.overlay === 'musica' ? crearReproductor(iframe) : null;
  if (reproductor) dialogo.querySelector('.ovl-vista-escena').append(reproductor);

  const cerrar = () => dialogo.close();
  dialogo.querySelector('.ovl-vista-cerrar').addEventListener('click', cerrar);
  dialogo.querySelector('.ovl-vista-accion').addEventListener('click', (evento) => {
    alAccionar(evento.currentTarget);
    cerrar();
  });
  // Atajo al overlay donde vive la skin, para ajustarla alli.
  dialogo.querySelector('.ovl-vista-atajo').addEventListener('click', () => {
    cerrar();
    alIrAOverlay(producto.overlay);
  });
  dialogo.addEventListener('click', (evento) => { if (evento.target === dialogo) cerrar(); }); // clic en el fondo
  dialogo.addEventListener('close', () => {
    reproductor?.detener();
    dialogo.remove(); // se va el iframe y su WebSocket
  });
  document.body.append(dialogo);
  dialogo.showModal();
}
