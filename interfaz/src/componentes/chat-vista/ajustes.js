/**
 * Ajustes visuales del chat en vivo (solo el chat, no el resto de la app):
 * tamano y tipografia, emotes por plataforma, pantalla dividida y plataformas
 * visibles. `aplicarVistaChat` los vuelca al contenedor via CSS vars y data-*;
 * `abrirAjustesChat` es el modal que los edita.
 */
import { t } from '../../nucleo/i18n/i18n.js';
import { PLATAFORMAS_CHAT } from './mensaje.js';

export const VISTA_CHAT_DEFECTO = {
  escala: 100, // % de zoom del log (80-200)
  fuente: 'sistema', // 'sistema' | una de FUENTES | 'otra'
  fuenteOtra: '', // nombre de cualquier fuente instalada
  emotes: true, // interruptor general
  emotesPlataforma: { tiktok: true, twitch: true, youtube: true, kick: true },
  emotesTerceros: true, // BetterTTV / 7TV / FFZ
  dividido: false,
  ocultas: [], // plataformas que no se muestran
};

export const ESCALA_MIN = 80;
export const ESCALA_MAX = 200;
const FUENTES = ['Inter', 'Arial', 'Verdana', 'Tahoma', 'Georgia', 'Trebuchet MS', 'Comic Sans MS', 'Courier New', 'Consolas'];

export function normalizarVistaChat(guardado) {
  const g = guardado && typeof guardado === 'object' ? guardado : {};
  const d = VISTA_CHAT_DEFECTO;
  const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Number(g.escala) || d.escala));
  return {
    escala,
    fuente: typeof g.fuente === 'string' ? g.fuente : d.fuente,
    fuenteOtra: typeof g.fuenteOtra === 'string' ? g.fuenteOtra.slice(0, 60) : '',
    emotes: g.emotes !== false,
    emotesPlataforma: Object.fromEntries(PLATAFORMAS_CHAT.map((p) => [p, g.emotesPlataforma?.[p] !== false])),
    emotesTerceros: g.emotesTerceros !== false,
    dividido: g.dividido === true,
    ocultas: Array.isArray(g.ocultas) ? g.ocultas.filter((p) => PLATAFORMAS_CHAT.includes(p)) : [],
  };
}

function familiaCss(cfg) {
  if (cfg.fuente === 'sistema') return '';
  const nombre = cfg.fuente === 'otra' ? cfg.fuenteOtra : cfg.fuente;
  const limpio = String(nombre).replace(/["';{}<>\\]/g, '').trim();
  return limpio ? `"${limpio}", sans-serif` : '';
}

/** @param {HTMLElement} contenedor elemento que envuelve a #chatLog @param {{setDividido(v:boolean):void}} gestor */
export function aplicarVistaChat(contenedor, cfg, gestor) {
  const c = normalizarVistaChat(cfg);
  const ff = familiaCss(c);
  contenedor.style.setProperty('--chat-escala', String(c.escala / 100));
  if (ff) contenedor.style.setProperty('--chat-ff', ff); else contenedor.style.removeProperty('--chat-ff');
  const sinEmotes = c.emotes
    ? [...PLATAFORMAS_CHAT.filter((p) => !c.emotesPlataforma[p]), ...(c.emotesTerceros ? [] : ['terceros'])]
    : ['todos'];
  contenedor.dataset.sinEmotes = sinEmotes.join(' ');
  contenedor.dataset.ocultas = c.ocultas.join(' ');
  gestor.setDividido(c.dividido);
}

function el(tag, props = {}, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...hijos);
  return e;
}

function fila(nombre, desc, control) {
  const texto = el('div', {}, el('div', { className: 'mc-a11y-nombre', textContent: nombre }));
  if (desc) texto.appendChild(el('p', { className: 'mc-bloque-desc', textContent: desc }));
  return el('div', { className: 'mc-a11y-fila cv-fila-ajuste' }, texto, control);
}

function interruptor(nombre, desc, marcado, onChange) {
  const input = el('input', { type: 'checkbox', checked: marcado });
  input.addEventListener('change', () => onChange(input.checked));
  const sw = el('span', { className: 'switch' }, input, el('span', { className: 'switch-track' }));
  const texto = el('div', {}, el('div', { className: 'mc-a11y-nombre', textContent: nombre }));
  if (desc) texto.appendChild(el('p', { className: 'mc-bloque-desc', textContent: desc }));
  return el('label', { className: 'mc-a11y-fila cv-fila-ajuste' }, texto, sw);
}

// Misma estructura que el modal "Mi cuenta": menu lateral por categorias + contenido.
const SECCIONES = [
  { id: 'texto', icono: 'text_fields', key: 'chatVista.seccionTexto' },
  { id: 'emotes', icono: 'mood', key: 'chatVista.seccionEmotes' },
  { id: 'pantalla', icono: 'view_column', key: 'chatVista.seccionPantalla' },
];

/**
 * Modal de ajustes. Se monta dentro de `contenedor` (no en body) para seguir
 * visible cuando ese contenedor esta en pantalla completa.
 * @param {{contenedor: HTMLElement, cfg: object, onChange: (cfg: object) => void}} p
 */
export function abrirAjustesChat({ contenedor, cfg, onChange, seccion = 'texto' }) {
  const actual = normalizarVistaChat(cfg);
  const emitir = () => onChange(normalizarVistaChat(actual));

  contenedor.querySelector('.cv-modal')?.remove();
  const overlay = el('div', { className: 'modal-overlay show cv-modal' });
  const ventana = el('div', { className: 'mc-ventana cv-ventana', role: 'dialog' });
  ventana.setAttribute('aria-modal', 'true');
  ventana.setAttribute('aria-labelledby', 'cvNavTitulo');
  overlay.appendChild(ventana);

  const cerrar = () => { overlay.remove(); document.removeEventListener('keydown', alEsc, true); };
  const alEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } };
  document.addEventListener('keydown', alEsc, true);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });

  const btnCerrar = el('button', { className: 'mc-cerrar', type: 'button', title: t('chatVista.cerrar') });
  btnCerrar.setAttribute('aria-label', t('chatVista.cerrar'));
  btnCerrar.appendChild(el('img', { src: 'icons/close.svg', alt: '' }));
  btnCerrar.addEventListener('click', cerrar);

  const contenido = el('section', { className: 'mc-contenido' });
  const nav = el('nav', { className: 'mc-nav' }, el('div', { className: 'mc-nav-titulo', id: 'cvNavTitulo', textContent: t('chatVista.titulo') }));
  const botones = SECCIONES.map((s) => {
    const b = el('button', { className: 'mc-nav-item', type: 'button' }, el('img', { src: `icons/${s.icono}.svg`, alt: '' }), el('span', { textContent: t(s.key) }));
    b.addEventListener('click', () => ir(s.id));
    nav.appendChild(b);
    return b;
  });

  const PINTAR = {
    texto() {
      const valor = el('span', { className: 'mc-valor', textContent: `${actual.escala}%` });
      const rango = el('input', { type: 'range', min: ESCALA_MIN, max: ESCALA_MAX, step: 10, value: actual.escala });
      rango.setAttribute('aria-label', t('chatVista.tamano'));
      rango.addEventListener('input', () => { actual.escala = Number(rango.value); valor.textContent = `${actual.escala}%`; emitir(); });

      const sel = el('select', { className: 'mc-input' });
      sel.setAttribute('aria-label', t('chatVista.fuente'));
      [['sistema', t('chatVista.fuenteSistema')], ...FUENTES.map((f) => [f, f]), ['otra', t('chatVista.fuenteOtra')]]
        .forEach(([v, txt]) => sel.appendChild(el('option', { value: v, textContent: txt, selected: v === actual.fuente })));
      const otra = el('input', { type: 'text', className: 'mc-input', maxLength: 60, value: actual.fuenteOtra, placeholder: t('chatVista.fuenteOtraEjemplo') });
      otra.hidden = actual.fuente !== 'otra';
      sel.addEventListener('change', () => { actual.fuente = sel.value; otra.hidden = actual.fuente !== 'otra'; emitir(); });
      otra.addEventListener('input', () => { actual.fuenteOtra = otra.value; emitir(); });

      return [
        fila(t('chatVista.tamano'), t('chatVista.tamanoAyuda'), el('div', { className: 'cv-control' }, rango, valor)),
        fila(t('chatVista.fuente'), t('chatVista.fuenteAyuda'), el('div', { className: 'cv-control cv-control-col' }, sel, otra)),
      ];
    },
    emotes() {
      const sub = el('div', { className: 'cv-grupo' });
      const pintarSub = () => { sub.hidden = !actual.emotes; };
      PLATAFORMAS_CHAT.forEach((p) => sub.appendChild(interruptor(p, '', actual.emotesPlataforma[p], (v) => { actual.emotesPlataforma[p] = v; emitir(); })));
      sub.appendChild(interruptor(t('chatVista.emotesTerceros'), '', actual.emotesTerceros, (v) => { actual.emotesTerceros = v; emitir(); }));
      pintarSub();
      return [
        interruptor(t('chatVista.emotesMostrar'), t('chatVista.emotesAyuda'), actual.emotes, (v) => { actual.emotes = v; pintarSub(); emitir(); }),
        el('h3', { className: 'mc-bloque-titulo mc-a11y-grupo', textContent: t('chatVista.emotesPorPlataforma') }),
        sub,
      ];
    },
    pantalla() {
      const reset = el('button', { type: 'button', className: 'mc-eliminar', textContent: t('chatVista.restablecer') });
      reset.addEventListener('click', () => { onChange(normalizarVistaChat(null)); cerrar(); abrirAjustesChat({ contenedor, cfg: null, onChange, seccion: 'pantalla' }); });
      const visibles = el('div', { className: 'cv-grupo' });
      PLATAFORMAS_CHAT.forEach((p) => visibles.appendChild(interruptor(p, '', !actual.ocultas.includes(p), (v) => {
        actual.ocultas = v ? actual.ocultas.filter((x) => x !== p) : [...actual.ocultas, p];
        emitir();
      })));
      return [
        interruptor(t('chatVista.dividido'), t('chatVista.divididoAyuda'), actual.dividido, (v) => { actual.dividido = v; emitir(); }),
        el('h3', { className: 'mc-bloque-titulo mc-a11y-grupo', textContent: t('chatVista.plataformasVisibles') }),
        visibles,
        el('div', { className: 'cv-pie-modal' }, reset),
      ];
    },
  };

  function ir(id) {
    const i = SECCIONES.findIndex((s) => s.id === id);
    botones.forEach((b, n) => { b.classList.toggle('is-active', n === i); if (n === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    contenido.replaceChildren(el('h2', { className: 'mc-titulo', textContent: t(SECCIONES[i].key) }), ...PINTAR[id]());
  }

  ventana.append(btnCerrar, nav, contenido);
  contenedor.appendChild(overlay);
  ir(seccion);
  btnCerrar.focus();
}
