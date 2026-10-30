/**
 * Reemplaza el dialogo del sistema de todo <input type="color"> por un panel propio.
 * El input sigue siendo la fuente del valor: al elegir se disparan 'input' y 'change'.
 */
import { t } from '../../nucleo/i18n/i18n.js';
import { hexAHsv, hsvAHex, normalizarHex } from './color.js';

const MUESTRAS = ['#ffffff', '#000000', '#f0213a', '#ff7a00', '#ffbb00', '#53fc18', '#25f4ee', '#3b82f6', '#9146ff', '#fe2c55'];
const MARGEN = 8;
const PASO_TECLADO = 0.02;

let abierto = null;

const limitar = (valor) => Math.min(1, Math.max(0, valor));

function cerrar(devolverFoco) {
  if (!abierto) return;
  const { panel, entrada } = abierto;
  abierto = null;
  panel.remove();
  if (devolverFoco) entrada.focus();
}

function colocar(panel, entrada) {
  const caja = entrada.getBoundingClientRect();
  const { offsetWidth: ancho, offsetHeight: alto } = panel;
  const cabeAbajo = caja.bottom + MARGEN + alto <= window.innerHeight;
  const arriba = cabeAbajo ? caja.bottom + MARGEN : caja.top - alto - MARGEN;
  panel.style.top = `${Math.max(MARGEN, arriba)}px`;
  panel.style.left = `${Math.max(MARGEN, Math.min(caja.right - ancho, window.innerWidth - ancho - MARGEN))}px`;
  panel.style.transformOrigin = `right ${cabeAbajo ? 'top' : 'bottom'}`;
}

function crearPanel(entrada) {
  const panel = document.createElement('div');
  panel.className = 'selector-color';
  panel.setAttribute('role', 'dialog');
  panel.innerHTML = `
    <div class="sc-area" tabindex="0" role="slider" aria-label="${t('selectorColor.area')}"><span class="sc-punto"></span></div>
    <input class="sc-tono" type="range" min="0" max="360" step="1" aria-label="${t('selectorColor.tono')}">
    <div class="sc-fila">
      <span class="sc-vista"></span>
      <input class="sc-hex" type="text" maxlength="7" spellcheck="false" aria-label="HEX">
    </div>
    <div class="sc-muestras">${MUESTRAS.map((color) => `<button class="sc-muestra" type="button" style="background:${color}" data-color="${color}" aria-label="${color}"></button>`).join('')}</div>`;

  const area = panel.querySelector('.sc-area');
  const punto = panel.querySelector('.sc-punto');
  const tono = panel.querySelector('.sc-tono');
  const vista = panel.querySelector('.sc-vista');
  const hex = panel.querySelector('.sc-hex');
  // HSV guardado aparte: pasar por hex perderia el tono al llegar a negro o gris.
  const hsv = hexAHsv(normalizarHex(entrada.value) || '#000000');

  const pintar = () => {
    const color = hsvAHex(hsv);
    area.style.setProperty('--tono', `hsl(${hsv.h} 100% 50%)`);
    punto.style.left = `${hsv.s * 100}%`;
    punto.style.top = `${(1 - hsv.v) * 100}%`;
    punto.style.background = color;
    tono.value = hsv.h;
    vista.style.background = color;
    if (document.activeElement !== hex) hex.value = color;
    panel.querySelectorAll('.sc-muestra').forEach((muestra) => {
      muestra.setAttribute('aria-pressed', String(muestra.dataset.color === color));
    });
  };

  const aplicar = () => {
    entrada.value = hsvAHex(hsv);
    entrada.dispatchEvent(new window.Event('input', { bubbles: true }));
    entrada.dispatchEvent(new window.Event('change', { bubbles: true }));
    pintar();
  };

  const moverEn = (evento) => {
    const caja = area.getBoundingClientRect();
    hsv.s = limitar((evento.clientX - caja.left) / caja.width);
    hsv.v = 1 - limitar((evento.clientY - caja.top) / caja.height);
    aplicar();
  };

  area.addEventListener('pointerdown', (evento) => {
    area.setPointerCapture(evento.pointerId);
    moverEn(evento);
  });
  area.addEventListener('pointermove', (evento) => {
    if (area.hasPointerCapture(evento.pointerId)) moverEn(evento);
  });
  area.addEventListener('keydown', (evento) => {
    const cambios = { ArrowLeft: ['s', -1], ArrowRight: ['s', 1], ArrowDown: ['v', -1], ArrowUp: ['v', 1] }[evento.key];
    if (!cambios) return;
    evento.preventDefault();
    hsv[cambios[0]] = limitar(hsv[cambios[0]] + cambios[1] * PASO_TECLADO);
    aplicar();
  });
  tono.addEventListener('input', () => {
    hsv.h = Number(tono.value);
    aplicar();
  });
  hex.addEventListener('input', () => {
    const color = normalizarHex(hex.value);
    if (!color) return;
    Object.assign(hsv, hexAHsv(color));
    aplicar();
  });
  hex.addEventListener('blur', pintar);
  panel.addEventListener('click', (evento) => {
    const muestra = evento.target.closest('.sc-muestra');
    if (!muestra) return;
    Object.assign(hsv, hexAHsv(muestra.dataset.color));
    aplicar();
  });
  panel.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    evento.stopPropagation();
    cerrar(true);
  });

  pintar();
  return panel;
}

function abrir(entrada) {
  cerrar(false);
  const panel = crearPanel(entrada);
  document.body.append(panel);
  colocar(panel, entrada);
  abierto = { panel, entrada };
  panel.querySelector('.sc-area').focus({ preventScroll: true });
}

export function iniciarSelectorColor() {
  // En captura y antes del click nativo: preventDefault evita que se abra el dialogo del sistema.
  document.addEventListener('click', (evento) => {
    if (!evento.target.matches?.('input[type="color"]')) return;
    evento.preventDefault();
    if (abierto?.entrada === evento.target) cerrar(false);
    else abrir(evento.target);
  }, true);
  document.addEventListener('pointerdown', (evento) => {
    if (abierto && !abierto.panel.contains(evento.target) && evento.target !== abierto.entrada) cerrar(false);
  }, true);
  // El panel es fijo: si la pagina se mueve, se separaria de su campo.
  document.addEventListener('scroll', (evento) => {
    if (abierto && !abierto.panel.contains(evento.target)) cerrar(false);
  }, true);
  window.addEventListener('resize', () => cerrar(false));
}
