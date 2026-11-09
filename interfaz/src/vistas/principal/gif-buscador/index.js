import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { leerEstadoUi, guardarEstadoUi } from '../../../nucleo/estado/estado-ui.js';
import { apiGifs } from './api.js';
import { crearBiblioteca } from './biblioteca.js';
import { crearIntro, guiaOculta } from './intro.js';
import { crearNavegador, hayNavegador } from './navegador.js';
import { crearSubir, crearSubnav } from './seccion-comun.js';

// Seccion "Buscador de GIF" del editor de canvas: un navegador para encontrar GIFs (con una guia previa) y
// la biblioteca "Mis GIFs" donde quedan guardados.
const VISTAS = ['navegador', 'biblioteca'];
const CLAVES_SUBNAV = { navegador: 'gifs.navegador', biblioteca: 'gifs.misGifs' };
const FORMATOS_SUBIR = 'image/gif,image/webp,image/png,video/mp4,video/webm'; // GIF, WebP/APNG animados o videos cortos
let vista = VISTAS.includes(leerEstadoUi().gifVista) ? leerEstadoUi().gifVista : VISTAS[0];
let mostrandoIntro = true;
let partes = null;

function pintar() {
  guardarEstadoUi({ gifVista: vista, gifIntro: mostrandoIntro });
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
export function iniciarGifBuscador(contenedor) {
  const { nav, botones } = crearSubnav(VISTAS, CLAVES_SUBNAV, (clave) => { vista = clave; pintar(); });
  const intro = crearIntro({ alAbrir: () => { mostrandoIntro = false; pintar(); } });
  const navegador = crearNavegador({ alVerGuia: () => { mostrandoIntro = true; pintar(); } });
  const biblioteca = crearBiblioteca({
    alCambiar: (cantidad) => {
      const cuenta = botones.biblioteca.querySelector('.gif-subpestana-cuenta');
      cuenta.textContent = cantidad ? String(cantidad) : '';
    },
  });
  const aviso = document.createElement('p');
  aviso.className = 'gif-aviso-app';
  aviso.dataset.i18n = 'gifs.soloApp';
  const cuerpo = document.createElement('div');
  cuerpo.className = 'gif-cuerpo';
  cuerpo.append(intro, navegador.raiz, biblioteca.raiz, aviso);
  nav.append(...crearSubir({
    subir: apiGifs.subir, accept: FORMATOS_SUBIR, claves: { boton: 'gifs.subir', subido: 'gifs.subido', duplicado: 'gifs.pDuplicado' },
    alSubir: () => { vista = 'biblioteca'; pintar(); biblioteca.recargar(); },
  }));
  contenedor.append(nav, cuerpo);
  partes = { botones, intro, navegador, biblioteca, aviso };
  mostrandoIntro = !guiaOculta() && leerEstadoUi().gifIntro !== false;
  aplicarTraducciones(contenedor);
  // Cada GIF anadido desde el navegador aparece en la biblioteca sin tener que abrirla.
  window.electronAPI?.gifBrowser?.onImportado(({ modo }) => { if (modo !== 'sonido') biblioteca.recargar(); });
  biblioteca.recargar();
}

/** La seccion pasa a verse: reabre el navegador (o la guia) donde estaba. */
export function alMostrarGif() {
  if (partes) pintar();
}

/** La seccion deja de verse (otra seccion del editor): la vista nativa no debe tapar nada. */
export function alOcultarGif() {
  partes?.navegador.ocultar();
}

/** El editor se cierra: se libera el proceso del navegador (la sesion y los logins se conservan). */
export function alCerrarGif() {
  partes?.navegador.cerrar();
  vista = VISTAS[0];
  mostrandoIntro = !guiaOculta();
  guardarEstadoUi({ gifVista: vista, gifIntro: mostrandoIntro, gifUrl: '' });
}
