import { cargarLocaleOverlay, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';

// Disposicion tipo mitad izquierda de teclado (TAB/QWER, ASDF, SHIFT/ZXC,
// SPACE) + 5 botones de mouse: misma geometria de composicion que usa
// Inkput (la app de referencia de este overlay, en /inkput-source) --
// solo se reusa el acomodo de teclas, el look es el del propio sistema
// de overlays de TTS (tarjeta oscura + --accent), no el de Inkput.
const UNIDAD = 44;
const GAP = 6;
const PASO = UNIDAD + GAP;
const TECLAS = [
  { id: 'TAB', x: 0, y: 0, w: 1.25 }, { id: 'Q', x: 1.25, y: 0, w: 1 }, { id: 'W', x: 2.25, y: 0, w: 1 }, { id: 'E', x: 3.25, y: 0, w: 1 }, { id: 'R', x: 4.25, y: 0, w: 1 },
  { id: 'A', x: 1.5, y: 1, w: 1 }, { id: 'S', x: 2.5, y: 1, w: 1 }, { id: 'D', x: 3.5, y: 1, w: 1 }, { id: 'F', x: 4.5, y: 1, w: 1 },
  { id: 'SHIFT', x: 0, y: 2, w: 2 }, { id: 'Z', x: 2, y: 2, w: 1 }, { id: 'X', x: 3, y: 2, w: 1 }, { id: 'C', x: 4, y: 2, w: 1 },
  { id: 'SPACE', x: 2.5, y: 3, w: 3 },
];
const MIN_VISIBLE_MS = 55; // una pulsacion mas corta que un frame igual se ve

// Cuerpo del mouse: mismo contorno/regiones que Inkput (la app de
// referencia), con el "look" propio de TTS puesto por CSS en vez del suyo
// (nada de sombras/halo tipo tinta) -- M1/M2 son los clics, M3 la rueda,
// M4/M5 los botones laterales (atras/adelante).
const MOUSE_VB_W = 110;
const MOUSE_VB_H = 160;
const MOUSE_BODY_D = 'M64,4 C84,4 98,16 99,40 L101,108 C102,138 86,156 64,156 C42,156 26,138 27,108 L29,40 C30,16 44,4 64,4 Z';
const MOUSE_SVG = [
  `<svg class="mouse-svg" viewBox="0 0 ${MOUSE_VB_W} ${MOUSE_VB_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`,
  `<path class="m-body" d="${MOUSE_BODY_D}"/>`,
  '<g class="m-part" data-k="M5"><rect class="shape" x="14" y="72" width="11.5" height="23" rx="5.75"/><text x="19.75" y="87.4">5</text></g>',
  '<g class="m-part" data-k="M4"><rect class="shape" x="14" y="99" width="11.5" height="23" rx="5.75"/><text x="19.75" y="114.4">4</text></g>',
  '<g class="m-part" data-k="M1"><path class="shape" d="M62,8.6 C47,9.6 34,19 33.4,40 L33,64 L62,64 Z"/></g>',
  '<g class="m-part" data-k="M2"><path class="shape" d="M66,8.6 C81,9.6 94,19 94.6,40 L95,64 L66,64 Z"/></g>',
  '<rect class="m-slot" x="56.5" y="16" width="15" height="36" rx="7.5"/>',
  '<g class="m-part m-wheel" data-k="M3"><rect class="shape" x="59.5" y="19" width="9" height="30" rx="4.5"/>',
  '<path class="m-ridge" d="M61.5,28 H66.5 M61.5,34 H66.5 M61.5,40 H66.5"/></g>',
  '</svg>',
].join('');

function construirDOM(stage) {
  const els = {};
  let maxX = 0;
  for (const k of TECLAS) {
    const el = document.createElement('div');
    el.className = 'tecl-key';
    el.textContent = k.id;
    el.style.left = (k.x * PASO) + 'px';
    el.style.top = (k.y * PASO) + 'px';
    el.style.width = (k.w * PASO - GAP) + 'px';
    el.style.height = UNIDAD + 'px';
    stage.appendChild(el);
    els[k.id] = el;
    maxX = Math.max(maxX, k.x * PASO + k.w * PASO - GAP);
  }

  const altoTeclado = 4 * PASO - GAP;
  const mouseH = altoTeclado;
  const mouseW = mouseH * (MOUSE_VB_W / MOUSE_VB_H);
  const mouseX = maxX + PASO;
  const mouseEl = document.createElement('div');
  mouseEl.className = 'tecl-mouse';
  mouseEl.style.left = mouseX + 'px';
  mouseEl.style.top = '0px';
  mouseEl.style.width = mouseW + 'px';
  mouseEl.style.height = mouseH + 'px';
  mouseEl.innerHTML = MOUSE_SVG;
  stage.appendChild(mouseEl);
  for (const g of mouseEl.querySelectorAll('[data-k]')) els[g.dataset.k] = g;

  stage.style.width = (mouseX + mouseW) + 'px';
  stage.style.height = altoTeclado + 'px';
  return els;
}

function nativo() {
  const cfg = iniciarOverlayFijo('teclado', 560, 210);
  document.body.classList.toggle('tema-claro', cfg.tema === 'claro');
  registrarErroresOverlay();
  const params = leerParametros();
  aplicarParametrosVisuales(params);
  iniciarAccesibilidadOverlay();

  const stage = document.getElementById('tecladoStage');
  const els = construirDOM(stage);
  const timers = {};
  const downAt = {};

  function set(id, on) {
    const el = els[id];
    if (!el) return;
    if (on) {
      clearTimeout(timers[id]);
      downAt[id] = performance.now();
      el.classList.add('on');
    } else {
      const falta = MIN_VISIBLE_MS - (performance.now() - (downAt[id] || 0));
      clearTimeout(timers[id]);
      if (falta > 0) timers[id] = setTimeout(() => el.classList.remove('on'), falta);
      else el.classList.remove('on');
    }
  }

  function releaseAll() {
    for (const id of Object.keys(els)) { clearTimeout(timers[id]); els[id].classList.remove('on'); }
  }

  conectarWSOverlay((msg) => {
    if (msg.type !== 'teclado-input') return;
    if (msg.t === 'd') set(msg.k, true);
    else if (msg.t === 'u') set(msg.k, false);
    else if (msg.t === 'r') releaseAll();
  }, { onOpen: releaseAll }); // cada reconexion limpia lo que haya quedado pulsado por un "up" perdido

  cargarLocaleOverlay().then(() => aplicarI18nOverlay());
}

nativo();
