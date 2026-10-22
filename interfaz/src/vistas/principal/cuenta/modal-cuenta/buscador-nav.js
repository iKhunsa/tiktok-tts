/**
 * Buscador del menu de "Mi cuenta": busca en el nombre de cada seccion y en
 * los textos de su contenido. Muestra los resultados en lugar del menu; al
 * elegir uno abre la seccion, lleva el scroll hasta ese texto y lo resalta.
 *
 * Las secciones solo se pintan al abrirlas, asi que el indice se arma la
 * primera vez que se busca pintando cada una en un contenedor suelto (fuera
 * del DOM) y leyendo sus textos traducidos ([data-i18n]).
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';

const MAX_RESULTADOS = 8;
const MS_RESALTADO = 1600;

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function indexar(secciones, estado) {
  const entradas = [];
  for (const s of secciones) {
    entradas.push({ seccion: s, texto: t(s.key), clave: null });
    const cont = document.createElement('div');
    const titulo = document.createElement('h2');
    titulo.className = 'mc-titulo';
    cont.appendChild(titulo);
    try { s.pintar?.(cont, estado); } catch (_) { continue; }
    aplicarTraducciones(cont);
    const vistas = new Set();
    for (const el of cont.querySelectorAll('[data-i18n]')) {
      const texto = el.textContent.trim();
      if (!texto || vistas.has(el.dataset.i18n)) continue;
      vistas.add(el.dataset.i18n);
      entradas.push({ seccion: s, texto, clave: el.dataset.i18n });
    }
  }
  return entradas;
}

function resaltar(contenido, clave) {
  const el = contenido.querySelector(`[data-i18n="${window.CSS.escape(clave)}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('mc-resaltado');
  void el.offsetWidth; // reinicia la animacion si se elige dos veces seguidas
  el.classList.add('mc-resaltado');
  setTimeout(() => el.classList.remove('mc-resaltado'), MS_RESALTADO);
}

export function iniciarBuscadorNav(overlay, secciones, { ir, estado }) {
  const nav = overlay.querySelector('.mc-nav');
  const buscador = nav.querySelector('.mc-nav-buscar input');
  const lista = document.createElement('div');
  lista.className = 'mc-resultados';
  lista.hidden = true;
  nav.querySelector('.mc-nav-titulo').after(lista);
  buscador.setAttribute('aria-label', t('cuentaModal.search'));

  let indice;
  const elegir = ({ seccion, clave }) => {
    ir(seccion.id);
    if (clave) resaltar(overlay.querySelector('.mc-contenido'), clave);
  };

  const filtrar = () => {
    const q = normalizar(buscador.value.trim());
    nav.classList.toggle('mc-nav-buscando', !!q);
    lista.hidden = !q;
    if (!q) return;
    indice ??= indexar(secciones, estado());
    const hallados = indice.filter((e) => normalizar(e.texto).includes(q)).slice(0, MAX_RESULTADOS);
    lista.replaceChildren(...hallados.map((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mc-nav-item mc-resultado';
      const icono = document.createElement('img');
      icono.src = `icons/${e.seccion.icono}.svg`;
      icono.alt = '';
      const texto = document.createElement('span');
      texto.className = 'mc-resultado-texto';
      texto.textContent = e.texto;
      const donde = document.createElement('span');
      donde.className = 'mc-resultado-seccion';
      donde.textContent = e.clave ? t(e.seccion.key) : '';
      b.append(icono, texto, donde);
      b.addEventListener('click', () => elegir(e));
      return b;
    }));
    if (!hallados.length) {
      const vacio = document.createElement('p');
      vacio.className = 'mc-resultados-vacio';
      vacio.textContent = t('cuentaModal.searchNoResults');
      lista.appendChild(vacio);
    }
  };

  buscador.addEventListener('input', filtrar);
  buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lista.querySelector('.mc-resultado')?.click();
    // Esc con texto limpia la busqueda en vez de cerrar el modal.
    if (e.key === 'Escape' && buscador.value) {
      e.stopPropagation();
      buscador.value = '';
      filtrar();
    }
  });
}
