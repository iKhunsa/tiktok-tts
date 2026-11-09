import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { leerEstadoUi, guardarEstadoUi } from '../../../nucleo/estado/estado-ui.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';

const BUSQUEDA_GIFS = 'https://www.google.com/search?tbm=isch&tbs=itp:animated&q=';
// Favoritos de la pantalla de inicio. `etiquetas` son claves de gifs.etiqueta.*; Google va aparte, al final.
const FAVORITOS = [
  { nombre: 'GIPHY', url: 'https://giphy.com', etiquetas: ['gifs', 'stickers', 'reacciones', 'memes'] },
  { nombre: 'Tenor', url: 'https://tenor.com', etiquetas: ['gifs', 'stickers', 'memes'] },
  { nombre: 'OtaGIFs', url: 'https://www.otagifs.com', etiquetas: ['gifs'] },
  { nombre: 'Anime-Gifs', url: 'https://anime-gifs.com', etiquetas: ['gifs'] },
  { nombre: 'Gifukai', url: 'https://gifukai.com', etiquetas: ['gifs'] },
  { nombre: 'KLIPY', url: 'https://klipy.com', etiquetas: ['gifs', 'stickers', 'clips'] },
  { nombre: 'GIFER', url: 'https://gifer.com', etiquetas: ['gifs'] },
  { nombre: 'GIFDB', url: 'https://gifdb.com', etiquetas: ['gifs', 'reacciones', 'stickers'] },
  { nombre: 'MakeaGIF', url: 'https://makeagif.com', etiquetas: ['gifs', 'creacion'], freemium: true },
  { nombre: 'GIFSEC', url: 'https://gifsec.com', etiquetas: ['reacciones'] },
  { nombre: 'MisterGIF', url: 'https://mistergif.com', etiquetas: ['gifs', 'categorias'] },
  { nombre: 'gifs.so', url: 'https://gifs.so', etiquetas: ['reacciones'] },
];
const GOOGLE = { nombre: 'Google', url: `${BUSQUEDA_GIFS}gif` };
// El mismo navegador sirve a "Buscador de GIF" y a "Efectos de sonido". Sonidos no tiene pantalla de sitios: abre MyInstants
// directo (la direccion sigue libre para ir a otra web) y el boton de inicio vuelve a el.
const MODOS = {
  gif: { clave: 'gifUrl', inicio: GOOGLE.url, conInicio: true, buscar: (texto) => `${BUSQUEDA_GIFS}${encodeURIComponent(`${texto} gif`)}` },
  sonido: {
    clave: 'sonidoUrl', inicio: 'https://www.myinstants.com/en/index/us/', conInicio: false,
    buscar: (texto) => `https://www.myinstants.com/en/search/?name=${encodeURIComponent(texto)}`,
  },
};
const CODIGOS_ERROR = [
  'url_invalida', 'url_privada', 'url_inalcanzable', 'formato_incompatible', 'no_animado', 'sitio_restringe', 'enlace_caducado',
  'muy_grande', 'tiempo_agotado', 'descarga_fallida', 'demasiadas_redirecciones', 'ocupado',
];

const api = () => window.electronAPI?.gifBrowser;
export const hayNavegador = () => !!api();

/** Un texto con espacios o sin forma de direccion es una busqueda de GIFs animados en Google. */
export function aDireccion(entrada, buscar = MODOS.gif.buscar) {
  const texto = entrada.trim();
  if (!texto) return null;
  const parecidaAUrl = /^https?:\/\//i.test(texto) || /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(texto);
  return parecidaAUrl ? texto : buscar(texto);
}

// Los textos del selector (la tarjeta flotante dentro de la pagina) los traduce la app y se los pasa al abrir.
const textosDelSelector = (modo) => ({
  agregar: t('gifs.pAgregar'), cancelar: t('gifs.pCancelar'), agregando: t('gifs.pAgregando'),
  pausar: t('gifs.pPausar'), activar: t('gifs.pActivar'), error: t('gifs.pError'),
  ...(modo === 'sonido' && { volumen: appSettings.sonidosVolumen, etiquetaVolumen: t('sonidos.volumen'), avisoVolumen: t('sonidos.volumenAviso') }),
  agregado: t(modo === 'sonido' ? 'sonidos.pAgregado' : 'gifs.pAgregado'), duplicado: t(modo === 'sonido' ? 'sonidos.pDuplicado' : 'gifs.pDuplicado'),
  errores: {
    ...Object.fromEntries(CODIGOS_ERROR.map((codigo) => [codigo, t(`gifs.error.${codigo}`)])),
    ...(modo === 'sonido' && { formato_incompatible: t('sonidos.error.formato') }),
  },
});

function boton(icono, clave, alPulsar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'gif-icono-boton';
  b.dataset.i18nTitle = `gifs.${clave}`;
  b.dataset.i18nAriaLabel = `gifs.${clave}`;
  b.innerHTML = `<img src="icons/${icono}.svg" alt="">`;
  b.addEventListener('click', alPulsar);
  return b;
}

/**
 * Barra y pagina del navegador de GIFs. La pagina es solo un hueco: el navegador real es una vista nativa
 * de Electron (Portal View) que el proceso principal coloca exactamente sobre ese hueco.
 */
export function crearNavegador({ alVerGuia, modo = 'gif' }) {
  const cfg = MODOS[modo];
  const raiz = document.createElement('div');
  raiz.className = 'gif-navegador';
  const barra = document.createElement('div');
  barra.className = 'gif-barra';
  const atras = boton('arrow_back', 'atras', () => api().back());
  const adelante = boton('arrow_forward', 'adelante', () => api().forward());
  const recargar = boton('refresh', 'recargar', () => api().reload());
  const direccion = document.createElement('input');
  direccion.className = 'gif-direccion';
  direccion.type = 'text';
  direccion.spellcheck = false;
  direccion.dataset.i18nPlaceholder = 'gifs.direccion';
  direccion.dataset.i18nAriaLabel = 'gifs.direccion';
  direccion.addEventListener('keydown', (evento) => {
    const destino = evento.key === 'Enter' && aDireccion(direccion.value, cfg.buscar);
    if (destino) { irA(destino); direccion.blur(); }
  });
  direccion.addEventListener('focus', () => direccion.select());
  barra.append(boton('home', 'inicio', () => irAInicio()), atras, adelante, recargar, direccion);
  if (alVerGuia) barra.append(boton('help_outline', 'introVerGuia', alVerGuia));
  const pagina = document.createElement('div');
  pagina.className = 'gif-pagina';
  const inicio = document.createElement('div');
  inicio.className = 'gif-inicio';
  raiz.append(barra, pagina, inicio);

  const urlGuardada = leerEstadoUi()[cfg.clave]; // tras una recarga se retoma la página donde estaba
  let ultimaUrl = urlGuardada || cfg.inicio;
  let abierto = false;
  let enInicio = cfg.conInicio && !urlGuardada;
  let yaAbierto = false; // la vista nativa ya existe: abrirla otra vez no navega, hay que pedirlo

  const rectPagina = () => {
    const { x, y, width, height } = pagina.getBoundingClientRect();
    return { x, y, width, height };
  };
  // Un hueco sin tamano (editor cerrado, otra seccion u otra vista) es un navegador que no debe verse.
  const sincronizar = () => {
    if (!abierto) return;
    const rect = rectPagina();
    if (rect.width < 2 || rect.height < 2) api().hide();
    else api().setBounds(rect);
  };
  new window.ResizeObserver(sincronizar).observe(pagina);
  window.addEventListener('resize', sincronizar);

  window.electronAPI?.gifBrowser?.onState((estado) => {
    if (estado.modo && estado.modo !== modo) return; // la pestana es una sola: el estado de la otra seccion no es de este navegador
    atras.disabled = !estado.puedeVolver;
    adelante.disabled = !estado.puedeAvanzar;
    recargar.classList.toggle('cargando', estado.cargando);
    if (estado.url) { ultimaUrl = estado.url; if (!enInicio) guardarEstadoUi({ [cfg.clave]: ultimaUrl }); }
    if (document.activeElement !== direccion) direccion.value = estado.url || '';
  });

  // Tarjeta de un sitio: todo texto entra con textContent.
  function tarjeta({ nombre, url, etiquetas, freemium }, google) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `gif-sitio${google ? ' google' : ''}`;
    const insignia = document.createElement('span');
    insignia.className = 'gif-sitio-insignia';
    insignia.textContent = nombre[0];
    // Logo del sitio (favicon); si no carga (sin red) queda la letra.
    const logo = document.createElement('img');
    logo.alt = '';
    logo.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(google ? 'https://google.com' : url)}`;
    logo.addEventListener('load', () => insignia.replaceChildren(logo), { once: true });
    const texto = document.createElement('span');
    texto.className = 'gif-sitio-texto';
    const titulo = document.createElement('strong');
    titulo.textContent = nombre;
    const desc = document.createElement('span');
    desc.textContent = google ? t('gifs.googleDesc') : etiquetas.map((e) => t(`gifs.etiqueta.${e}`)).join(' · ');
    texto.append(titulo, desc);
    b.append(insignia, texto);
    if (!google) {
      const acceso = document.createElement('span');
      acceso.className = `gif-sitio-acceso${freemium ? ' freemium' : ''}`;
      acceso.textContent = t(freemium ? 'gifs.acceso.freemium' : 'gifs.acceso.gratis');
      b.append(acceso);
    }
    b.addEventListener('click', () => irA(url));
    return b;
  }

  function pintarInicio() {
    const encabezado = document.createElement('div');
    encabezado.className = 'gif-inicio-encabezado';
    encabezado.innerHTML = '<h3 data-i18n="gifs.inicioTitulo"></h3><p data-i18n="gifs.inicioDesc"></p>';
    const rejilla = document.createElement('div');
    rejilla.className = 'gif-sitios';
    rejilla.append(...FAVORITOS.map((sitio) => tarjeta(sitio)), tarjeta(GOOGLE, true));
    inicio.replaceChildren(encabezado, rejilla);
    aplicarTraducciones(inicio);
  }

  // En el inicio la vista nativa se oculta y se ven los favoritos; fuera de el, al reves.
  function mostrarVista() {
    pagina.hidden = enInicio;
    inicio.hidden = !enInicio;
    if (enInicio) { pintarInicio(); api()?.hide(); return; }
    requestAnimationFrame(async () => {
      await api().open(rectPagina(), ultimaUrl, textosDelSelector(modo), modo);
      yaAbierto = true;
      sincronizar();
    });
  }

  function irA(url) {
    const navegar = yaAbierto;
    ultimaUrl = url;
    enInicio = false;
    guardarEstadoUi({ [cfg.clave]: url });
    abierto = true;
    if (navegar) api().navigate(url);
    mostrarVista();
  }

  function irAInicio() {
    if (!cfg.conInicio) { irA(cfg.inicio); return; }
    enInicio = true;
    guardarEstadoUi({ [cfg.clave]: '' });
    mostrarVista();
  }

  return {
    raiz,
    /** Muestra el navegador: la primera vez, los sitios favoritos; despues retoma donde se dejo. */
    abrir() {
      abierto = true;
      mostrarVista();
    },
    /** Oculta la vista nativa (queda viva, con su pagina) para que no tape otra pantalla. */
    ocultar() {
      abierto = false;
      api()?.hide();
    },
    /** Cierra la pestana y libera su proceso; la sesion (cookies, logins) se conserva. */
    cerrar() {
      abierto = false;
      yaAbierto = false;
      enInicio = cfg.conInicio;
      api()?.close();
    },
  };
}
