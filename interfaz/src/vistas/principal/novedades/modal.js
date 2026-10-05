import changelogRaw from '../../../../../CHANGELOG.md?raw';
import { parsearChangelog } from './parse-changelog.js';
import { extraerIdYoutube } from './extraer-id-youtube.js';
import { crearVideoNovedades } from './crear-video-novedades.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { trackUi } from '../../../nucleo/telemetria-ui.js';

const MARCAS_INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^)\s]+\))/;
const ENLACE_YOUTUBE = /^\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^)\s]+)\)$/;
const SECCION_VIDEOS = 'Videos de YouTube';

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;
  return el;
}

// Solo **negrita** y `código`: es todo lo que usa el CHANGELOG. Se arma con
// nodos (nunca innerHTML) para que el texto no pueda inyectar markup.
function agregarTextoInline(padre, texto) {
  for (const trozo of texto.split(MARCAS_INLINE)) {
    if (!trozo) continue;
    if (trozo.startsWith('**')) padre.append(crear('strong', '', trozo.slice(2, -2)));
    else if (trozo.startsWith('`')) padre.append(crear('code', '', trozo.slice(1, -1)));
    else if (trozo.startsWith('[') && ENLACE_YOUTUBE.test(trozo)) {
      const [, titulo, url] = trozo.match(ENLACE_YOUTUBE);
      const enlace = crear('a', 'news-youtube-link', titulo);
      enlace.href = url;
      enlace.target = '_blank';
      enlace.rel = 'noopener';
      padre.append(enlace);
    }
    else padre.append(trozo);
  }
}

function crearVersion({ version, fecha, etiqueta, secciones }) {
  const bloque = crear('section', 'news-version');
  const titulo = crear('h3', '', `v${version}`);
  if (fecha) titulo.append(crear('span', 'news-date', fecha));
  if (etiqueta) titulo.append(crear('span', 'news-tag', etiqueta));
  bloque.append(titulo);

  for (const { titulo: nombre, items } of secciones) {
    bloque.append(crear('h4', 'news-section', nombre));
    const lista = crear('ul', 'news-items');
    for (const texto of items) {
      const li = crear('li');
      agregarTextoInline(li, texto);
      lista.append(li);
    }
    bloque.append(lista);
  }
  return bloque;
}

// El video de la versión más reciente que lo trae va arriba de todo el texto,
// embebido; su sección no se repite como lista de enlaces.
function separarVideo(versiones) {
  let idVideo = null;
  const sinVideos = versiones.map((version) => {
    const secciones = version.secciones.filter((seccion) => {
      if (seccion.titulo !== SECCION_VIDEOS) return true;
      const enlace = seccion.items.map((item) => ENLACE_YOUTUBE.exec(item)).find(Boolean);
      idVideo = idVideo || (enlace && extraerIdYoutube(enlace[2]));
      return false;
    });
    return { ...version, secciones };
  });
  return { idVideo, versiones: sinVideos };
}

let renderizado = false;
let idVideoNovedades = null;

export function abrirNovedades() {
  trackUi('ui:news-opened');
  const lista = document.getElementById('newsList');
  if (!renderizado) {
    const { idVideo, versiones } = separarVideo(parsearChangelog(changelogRaw));
    idVideoNovedades = idVideo;
    lista.replaceChildren(...versiones.map(crearVersion));
    renderizado = true;
  }
  // El reproductor existe solo mientras el modal está abierto: al cerrarlo se
  // destruye y el video deja de sonar.
  if (idVideoNovedades && !lista.querySelector('.news-video')) {
    lista.prepend(crearVideoNovedades(idVideoNovedades, t('news.videoTitle')));
  }
  document.getElementById('newsModal').classList.add('show');
}

function cerrarNovedades() {
  document.getElementById('newsModal').classList.remove('show');
  document.querySelector('#newsList .news-video')?.remove();
}

export function iniciarModalNovedades() {
  const modal = document.getElementById('newsModal');
  document.getElementById('newsModalClose').addEventListener('click', cerrarNovedades);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarNovedades(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarNovedades(); });
}
