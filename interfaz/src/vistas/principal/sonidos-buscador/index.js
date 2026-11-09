import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { leerEstadoUi, guardarEstadoUi } from '../../../nucleo/estado/estado-ui.js';
import { apiSonidos } from '../gif-buscador/api.js';
import { crearBiblioteca, elemento } from '../gif-buscador/biblioteca.js';
import { crearIntro, guiaOculta } from '../gif-buscador/intro.js';
import { crearNavegador, hayNavegador } from '../gif-buscador/navegador.js';
import { crearSubir, crearSubnav } from '../gif-buscador/seccion-comun.js';

// Seccion "Efectos de sonido" del editor de canvas: MyInstants (u otra web) dentro de la app, con el selector que
// guarda cada sonido que se pulsa (y una guia previa), y la biblioteca "Mis sonidos" donde quedan. Misma estructura
// que el buscador de GIF.
const VISTAS = ['navegador', 'biblioteca'];
const CLAVES_SUBNAV = { navegador: 'gifs.navegador', biblioteca: 'sonidos.misSonidos' };
const FORMATOS_SUBIR = 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,.mp3,.wav,.ogg,.flac,.m4a';
const CLAVE_GUIA_OCULTA = 'tikliveTTS_sonidosGuiaOculta';
let vista = VISTAS.includes(leerEstadoUi().sonidoVista) ? leerEstadoUi().sonidoVista : VISTAS[0];
let mostrandoIntro = true;
let partes = null;

// La vista previa es un icono (se puede arrastrar a una carpeta) y el sonido se oye con el reproductor nativo de
// debajo; `preload=none` evita descargar toda la biblioteca al abrirla.
function vistaAudio() {
  return Object.assign(elemento('img', 'gif-medio sonido-icono'), { src: 'icons/music_note.svg', alt: '' });
}
function controlesAudio(item) {
  const audio = elemento('audio', 'sonido-reproductor');
  audio.controls = true;
  audio.preload = 'none';
  audio.src = item.src;
  return audio;
}

function pintar() {
  guardarEstadoUi({ sonidoVista: vista, sonidoIntro: mostrandoIntro });
  const { botones, intro, navegador, biblioteca, aviso } = partes;
  VISTAS.forEach((clave) => botones[clave].classList.toggle('activa', clave === vista));
  const enNavegador = vista === 'navegador';
  const sinMotor = enNavegador && !hayNavegador();
  aviso.hidden = !sinMotor;
  intro.hidden = !(enNavegador && mostrandoIntro && !sinMotor);
  navegador.raiz.hidden = !(enNavegador && !mostrandoIntro && !sinMotor);
  biblioteca.raiz.hidden = enNavegador;
  // La vista nativa del navegador solo se ve cuando su hueco esta a la vista; en cualquier otro caso se oculta.
  if (navegador.raiz.hidden) navegador.ocultar();
  else navegador.abrir();
  if (!enNavegador) biblioteca.abrir();
}

/** Monta la seccion dentro de `contenedor` (el <section> vacio del editor). */
export function iniciarSonidosBuscador(contenedor) {
  const { nav, botones } = crearSubnav(VISTAS, CLAVES_SUBNAV, (clave) => { vista = clave; pintar(); });
  const intro = crearIntro({ alAbrir: () => { mostrandoIntro = false; pintar(); }, prefijo: 'sonidos', claveOcultar: CLAVE_GUIA_OCULTA, iconoSenala: 'music_note' });
  const navegador = crearNavegador({ modo: 'sonido', alVerGuia: () => { mostrandoIntro = true; pintar(); } });
  const biblioteca = crearBiblioteca({
    api: apiSonidos,
    vistaMedio: vistaAudio,
    controles: controlesAudio,
    evento: 'sonidos:cambiaron',
    claves: { buscar: 'sonidos.buscar', contador: 'sonidos.contador', vacio: 'sonidos.vacio' },
    alCambiar: (cantidad) => { botones.biblioteca.querySelector('.gif-subpestana-cuenta').textContent = cantidad ? String(cantidad) : ''; },
  });
  const aviso = elemento('p', 'gif-aviso-app');
  aviso.dataset.i18n = 'sonidos.soloApp';
  const cuerpo = elemento('div', 'gif-cuerpo');
  cuerpo.append(intro, navegador.raiz, biblioteca.raiz, aviso);
  nav.append(...crearSubir({
    subir: apiSonidos.subir, accept: FORMATOS_SUBIR, claves: { boton: 'sonidos.subir', subido: 'sonidos.subido', duplicado: 'sonidos.pDuplicado', errorFormato: 'sonidos.error.formato' },
    alSubir: () => { vista = 'biblioteca'; pintar(); biblioteca.recargar(); },
  }));
  contenedor.append(nav, cuerpo);
  partes = { botones, intro, navegador, biblioteca, aviso };
  mostrandoIntro = !guiaOculta(CLAVE_GUIA_OCULTA) && leerEstadoUi().sonidoIntro !== false;
  aplicarTraducciones(contenedor);
  // Cada sonido añadido desde el navegador aparece en la biblioteca sin tener que abrirla.
  window.electronAPI?.gifBrowser?.onImportado(({ modo }) => { if (modo === 'sonido') biblioteca.recargar(); });
  // El volumen que el usuario deja en la ventana del navegador se recuerda para la proxima vez.
  window.electronAPI?.gifBrowser?.onVolumen(({ volumen }) => { appSettings.sonidosVolumen = volumen; saveSettings(); });
  biblioteca.recargar();
}

/** La seccion pasa a verse: reabre el navegador (o la guia) donde estaba. */
export function alMostrarSonidos() {
  if (partes) pintar();
}

/** La seccion deja de verse (otra seccion del editor): la vista nativa no debe tapar nada. */
export function alOcultarSonidos() {
  partes?.navegador.ocultar();
}

/** El editor se cierra: se libera el proceso del navegador (la sesion y los logins se conservan). */
export function alCerrarSonidos() {
  partes?.navegador.cerrar();
  vista = VISTAS[0];
  mostrandoIntro = !guiaOculta(CLAVE_GUIA_OCULTA);
  guardarEstadoUi({ sonidoVista: vista, sonidoIntro: mostrandoIntro, sonidoUrl: '' });
}
