import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { ESQUEMAS } from '../../../compartido/estilo/esquemas.js';
import { probarMuestra, updateOverlayUrl } from './configurador-overlays.js';
import { sincronizarCamposOverlay } from './campos-overlay/sincronizar.js';
import { crearSelectorSkin } from './selector-skin.js';

const FORMATOS = {
  '16:9': { ancho: 1920, alto: 1080, clave: 'horizontal' },
  '9:16': { ancho: 1080, alto: 1920, clave: 'vertical' },
};

const formatoActual = () => FORMATOS[appSettings.overlayLienzo];

// El iframe se dibuja a la resolucion real, como en OBS, y se reduce para caber en el espacio disponible.
function ajustarMarco(escenario) {
  const { ancho, alto } = formatoActual();
  const escala = Math.min(escenario.clientWidth / ancho, escenario.clientHeight / alto);
  if (!(escala > 0)) return;
  const marco = escenario.firstElementChild;
  marco.style.width = `${ancho * escala}px`;
  marco.style.height = `${alto * escala}px`;
  const iframe = marco.firstElementChild;
  iframe.style.width = `${ancho}px`;
  iframe.style.height = `${alto}px`;
  iframe.style.transform = `scale(${escala})`;
}

/** Marca el formato elegido en todas las tarjetas y ajusta sus lienzos. */
export function pintarLienzos() {
  const { ancho, alto } = formatoActual();
  document.querySelectorAll('.ovl-escenario').forEach(ajustarMarco);
  document.querySelectorAll('[data-lienzo]').forEach((boton) => {
    boton.setAttribute('aria-pressed', String(boton.dataset.lienzo === appSettings.overlayLienzo));
  });
  document.querySelectorAll('[data-lienzo-medida]').forEach((medida) => {
    medida.textContent = `${ancho} × ${alto}`;
  });
}

const limitar = (valor) => Math.round(Math.min(1, Math.max(-1, valor)) * 1000) / 1000;

// Mientras se arrastra solo se mueve el iframe por CSS: guardar en cada paso recargaria la vista previa.
function permitirArrastre(marco, iframe, overlay) {
  const capa = document.createElement('div');
  capa.className = 'ovl-arrastre';
  capa.dataset.i18nTitle = 'overlayCfg.arrastrar';
  let inicio = null;
  let destino = null;
  capa.addEventListener('pointerdown', (evento) => {
    capa.setPointerCapture(evento.pointerId);
    const { desplazaX, desplazaY } = appSettings.overlays[overlay];
    inicio = { x: evento.clientX, y: evento.clientY, desplazaX, desplazaY };
    destino = null;
  });
  capa.addEventListener('pointermove', (evento) => {
    if (!inicio) return;
    destino = {
      desplazaX: limitar(inicio.desplazaX + (evento.clientX - inicio.x) / marco.clientWidth),
      desplazaY: limitar(inicio.desplazaY + (evento.clientY - inicio.y) / marco.clientHeight),
    };
    const raiz = iframe.contentDocument?.documentElement.style;
    raiz?.setProperty('--dx', `${destino.desplazaX * 100}vw`);
    raiz?.setProperty('--dy', `${destino.desplazaY * 100}vh`);
  });
  const soltar = () => {
    inicio = null;
    if (!destino) return;
    Object.assign(appSettings.overlays[overlay], destino);
    destino = null;
    saveSettings();
    updateOverlayUrl(overlay);
    sincronizarCamposOverlay(overlay);
  };
  capa.addEventListener('pointerup', soltar);
  capa.addEventListener('pointercancel', soltar);
  marco.append(capa);
  aplicarTraducciones(marco);
}

// El escenario entero pasa a pantalla completa: su ResizeObserver reajusta el lienzo solo. Esc tambien sale.
function crearBotonPantallaCompleta(escenario) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'ovl-pantalla-completa';
  boton.dataset.i18nTitle = 'overlayCfg.pantallaCompleta';
  boton.dataset.i18nAriaLabel = 'overlayCfg.pantallaCompleta';
  const icono = document.createElement('img');
  icono.src = 'icons/fullscreen.svg';
  icono.alt = '';
  boton.append(icono);
  boton.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else escenario.requestFullscreen();
  });
  escenario.addEventListener('fullscreenchange', () => {
    icono.src = document.fullscreenElement === escenario ? 'icons/fullscreen_exit.svg' : 'icons/fullscreen.svg';
  });
  return boton;
}

/** Envuelve la vista previa en un escenario que mantiene la proporcion del formato. */
export function crearEscenario(iframe) {
  const escenario = document.createElement('div');
  escenario.className = 'ovl-escenario';
  const marco = document.createElement('div');
  marco.className = 'ovl-marco';
  marco.append(iframe);
  escenario.append(marco);
  const overlay = iframe.dataset.preview;
  if (ESQUEMAS[overlay].some(({ clave }) => clave === 'desplazaX')) permitirArrastre(marco, iframe, overlay);
  escenario.append(crearBotonPantallaCompleta(escenario));
  if (ESQUEMAS[overlay].some(({ clave }) => clave === 'skin')) escenario.append(crearSelectorSkin(overlay));
  aplicarTraducciones(escenario);
  new window.ResizeObserver(() => ajustarMarco(escenario)).observe(escenario);
  return escenario;
}

function crearBotonFormato(formato, { clave }) {
  return `<button class="cfg-boton" type="button" data-lienzo="${formato}"><span data-i18n="overlayCfg.opcion.${clave}"></span> ${formato}</button>`;
}

/** Primera seccion del panel: el formato es uno solo para todos los overlays. */
export function crearSeccionLienzo() {
  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo';
  seccion.open = true;
  seccion.innerHTML = `
    <summary class="cfg-grupo-titulo" data-i18n="overlayCfg.grupo.lienzo"></summary>
    <div class="cfg-botones" role="group">${Object.entries(FORMATOS).map(([formato, datos]) => crearBotonFormato(formato, datos)).join('')}</div>
    <p class="cfg-lienzo-nota"><span data-i18n="overlayCfg.lienzoNota"></span> <strong data-lienzo-medida></strong></p>`;
  seccion.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-lienzo]');
    if (!boton) return;
    appSettings.overlayLienzo = boton.dataset.lienzo;
    saveSettings();
    pintarLienzos();
  });
  aplicarTraducciones(seccion);
  return seccion;
}

/** Enseña en la vista previa cada nivel de la alerta (Bits, Kicks, Super Chat). */
export function crearSeccionNiveles(iframe, { muestras, inicial }) {
  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo';
  seccion.innerHTML = `
    <summary class="cfg-grupo-titulo" data-i18n="overlayCfg.grupo.probarNiveles"></summary>
    <div class="cfg-botones" role="group">${muestras.map(({ etiqueta }, i) => `<button class="cfg-boton" type="button" data-nivel="${i}" aria-pressed="${i === inicial}">${etiqueta}</button>`).join('')}</div>
    <p class="cfg-lienzo-nota" data-i18n="overlayCfg.probarNivelesNota"></p>`;
  seccion.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-nivel]');
    if (!boton) return;
    seccion.querySelectorAll('[data-nivel]').forEach((otro) => otro.setAttribute('aria-pressed', String(otro === boton)));
    probarMuestra(iframe, boton.dataset.nivel);
  });
  aplicarTraducciones(seccion);
  return seccion;
}
