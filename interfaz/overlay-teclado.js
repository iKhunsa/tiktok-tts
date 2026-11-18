import { cargarLocaleOverlay, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, strParam } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { DEFAULT_TECLADO_KEYS } from './compartido/teclado-keys.js';

// Grilla de teclas elegidas por el usuario (features/configuracion,
// tecladoKeys: [{key,w}]) + 5 botones de mouse fijos a la derecha. Cada tecla
// tiene su propio ancho (w, en unidades — TAB/SHIFT/SPACE suelen ser mas
// anchas que una tecla normal en un teclado real) y la cantidad de teclas es
// variable (agregar/quitar desde la app). Se acomodan en filas que no superan
// FILA_ANCHO_MAX unidades, en el orden de la lista — ese orden es lo que el
// usuario cambia al "intercambiar posiciones" en el panel de ajustes.
const UNIDAD = 44;
const GAP = 6;
const PASO = UNIDAD + GAP;
const FILA_ANCHO_MAX = 5.5; // reproduce el layout original (TAB/QWER, ASDF, SHIFT/ZXC, SPACE)
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

// Acomoda las teclas en filas sin pasarse de FILA_ANCHO_MAX unidades, en el
// orden de la lista (mismo criterio que un wrap de izquierda a derecha).
function distribuirFilas(keys) {
  const filas = [];
  let fila = [];
  let ancho = 0;
  for (const entry of keys) {
    if (fila.length && ancho + entry.w > FILA_ANCHO_MAX) {
      filas.push(fila);
      fila = [];
      ancho = 0;
    }
    fila.push(entry);
    ancho += entry.w;
  }
  if (fila.length) filas.push(fila);
  return filas;
}

// Reconstruye todo el stage desde cero: se llama al cargar y cada vez que
// cambia la lista de teclas (agregar/quitar/reordenar/preset/ancho), porque
// la cantidad de filas y el ancho del stage pueden cambiar. `mouseIzquierda`
// es un ajuste puramente visual de ESTE overlay (param `mp` en la URL, ver
// esquemas.js), no afecta que tecla dispara que boton de mouse.
function construirDOM(stage, keys, mouseIzquierda) {
  stage.replaceChildren();
  const els = {};
  const filas = distribuirFilas(keys);
  const anchoUnidades = filas.reduce((max, fila) => Math.max(max, fila.reduce((s, e) => s + e.w, 0)), 0);
  const altoGrilla = filas.length * PASO - GAP;
  const anchoGrilla = anchoUnidades * PASO - GAP;
  const mouseH = altoGrilla;
  const mouseW = mouseH * (MOUSE_VB_W / MOUSE_VB_H);
  const keysX = mouseIzquierda ? mouseW + PASO : 0;
  const mouseX = mouseIzquierda ? 0 : anchoGrilla + PASO;

  filas.forEach((fila, y) => {
    let x = 0;
    for (const entry of fila) {
      const el = document.createElement('div');
      el.className = 'tecl-key';
      el.textContent = entry.key;
      el.style.left = (keysX + x * PASO) + 'px';
      el.style.top = (y * PASO) + 'px';
      el.style.width = (entry.w * PASO - GAP) + 'px';
      el.style.height = UNIDAD + 'px';
      stage.appendChild(el);
      els[entry.key] = el;
      x += entry.w;
    }
  });

  const mouseEl = document.createElement('div');
  mouseEl.className = 'tecl-mouse';
  mouseEl.style.left = mouseX + 'px';
  mouseEl.style.top = '0px';
  mouseEl.style.width = mouseW + 'px';
  mouseEl.style.height = mouseH + 'px';
  mouseEl.innerHTML = MOUSE_SVG;
  stage.appendChild(mouseEl);
  for (const g of mouseEl.querySelectorAll('[data-k]')) els[g.dataset.k] = g;

  stage.style.width = (mouseW + PASO + anchoGrilla) + 'px';
  stage.style.height = altoGrilla + 'px';
  return els;
}

async function nativo() {
  const cfg = iniciarOverlayFijo('teclado', 560, 210);
  document.body.classList.toggle('tema-claro', cfg.tema === 'claro');
  registrarErroresOverlay();
  const params = leerParametros();
  aplicarParametrosVisuales(params);
  iniciarAccesibilidadOverlay();
  const mouseIzquierda = strParam(params, 'mp', 'derecha') === 'izquierda';

  // La lista de teclas (que, cuantas y su ancho) viene del config del
  // servidor, no de la URL — es global a la app, no por-escena de OBS.
  let keys = DEFAULT_TECLADO_KEYS;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const remotas = (await res.json()).tecladoKeys;
      if (Array.isArray(remotas) && remotas.length) keys = remotas;
    }
  } catch (_) { /* sin config real, se muestra el layout de siempre */ }

  const stage = document.getElementById('tecladoStage');
  let els = construirDOM(stage, keys, mouseIzquierda);
  let timers = {};
  let downAt = {};

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
    if (msg.type === 'config-updated') {
      if (Array.isArray(msg.config && msg.config.tecladoKeys)) {
        for (const id of Object.keys(timers)) clearTimeout(timers[id]);
        timers = {}; downAt = {};
        keys = msg.config.tecladoKeys;
        els = construirDOM(stage, keys, mouseIzquierda);
      }
      return;
    }
    if (msg.type !== 'teclado-input') return;
    if (msg.t === 'd') set(msg.k, true);
    else if (msg.t === 'u') set(msg.k, false);
    else if (msg.t === 'r') releaseAll();
  }, { onOpen: releaseAll }); // cada reconexion limpia lo que haya quedado pulsado por un "up" perdido

  cargarLocaleOverlay().then(() => aplicarI18nOverlay());
}

nativo();
