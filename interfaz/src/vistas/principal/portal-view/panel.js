import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { almacenPortalView } from './estado.js';
import { crearDivisor } from '../../../componentes/divisor-arrastrable.js';
import { crearTabBar, actualizarTabBar } from './tab-bar.js';
import { crearToolbar, actualizarToolbar } from './toolbar.js';
import { crearNuevaPestana, actualizarNuevaPestana } from './nueva-pestana.js';

let panelEl = null;
let tabBarEl = null;
let toolbarEl = null;
let nuevaPestanaEl = null;
let divisor = null;
// Invalida respuestas de resizePanel() fuera de orden (el usuario puede mover
// el mouse mas rapido de lo que IPC responde) y respuestas que lleguen
// despues de soltar el divisor (handleDragEnd ya tiene la ultima palabra).
let dragSeq = 0;

function activeTab() {
  const { tabs, activeTabId } = almacenPortalView.getState();
  return tabs.find((t) => t.id === activeTabId) || null;
}

function anchoInicialPx() {
  const pct = almacenPortalView.getState().panelWidthPct || 0.5;
  return Math.round(window.innerWidth * pct);
}

function aplicarAnchoPanel(widthPx) {
  if (panelEl) panelEl.style.flexBasis = `${widthPx}px`;
}

// El backend (electron-shell/portal-view/bounds.js#clampPanelWidth) es la
// UNICA autoridad del limite real (depende de LEFT_MIN_PX/MAX_PANEL_WIDTH_PCT
// Y del ancho actual de la ventana) — el front nunca aplica el valor crudo
// que el mouse pide, siempre espera el valor ya clampeado que devuelve
// resizePanel(). Evita que la UI muestre un ancho invalido, aunque sea un
// frame.
function handleDrag(widthPx) {
  const seq = ++dragSeq;
  window.electronAPI?.portalView?.resizePanel(widthPx).then((res) => {
    if (seq !== dragSeq || !res) return; // respuesta obsoleta: ignorar
    aplicarAnchoPanel(res.panelWidthPx);
  });
}

function handleDragEnd(widthPx) {
  dragSeq++; // invalida cualquier resizePanel() todavia en vuelo
  window.electronAPI?.portalView?.setPanelWidth(widthPx).then((res) => {
    const finalPx = res?.panelWidthPx ?? widthPx;
    aplicarAnchoPanel(finalPx);
    divisor?.setWidth(finalPx);
    if (window.innerWidth) almacenPortalView.setState({ panelWidthPct: finalPx / window.innerWidth });
  });
}

function crearPanelEl() {
  const el = document.createElement('aside');
  el.className = 'portal-view-panel';

  tabBarEl = crearTabBar();
  toolbarEl = crearToolbar();
  const contentEl = document.createElement('div');
  contentEl.className = 'portal-view-content';
  nuevaPestanaEl = crearNuevaPestana();
  contentEl.appendChild(nuevaPestanaEl);

  el.append(tabBarEl, toolbarEl, contentEl);
  aplicarTraducciones(el);
  return el;
}

function montar() {
  if (panelEl) return;
  const initialPx = anchoInicialPx();
  panelEl = crearPanelEl();
  // minPx/maxPx acá son solo para que el divisor no reporte valores absurdos
  // (negativos, mayores a la ventana) mientras el mouse se mueve — no son el
  // limite real, ese lo aplica el backend en cada resizePanel().
  divisor = crearDivisor({
    minPx: 0,
    maxPx: window.innerWidth,
    initialPx,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
  });
  aplicarAnchoPanel(initialPx);
}

export function actualizarPanelPortalView() {
  if (!panelEl) return;
  const tab = activeTab();
  if (tabBarEl) actualizarTabBar(tabBarEl);
  if (toolbarEl) actualizarToolbar(toolbarEl);
  // Pestana sin URL (nueva pestana real o restaurada-sin-hidratar-todavia
  // pero esa siempre tiene url) — no hay WebContentsView nativo ocupando el
  // espacio, se muestra la grilla de accesos en su lugar.
  if (nuevaPestanaEl) {
    const mostrar = !tab?.url;
    nuevaPestanaEl.style.display = mostrar ? '' : 'none';
    if (mostrar) actualizarNuevaPestana(nuevaPestanaEl);
  }
}

// Refleja panelWidthPct del estado (fuente: backend) en el CSS + estado
// interno del divisor. Se llama tras cada portal:state-changed — cubre el
// caso "la ventana cambio de tamano (maximizar/restaurar) mientras el panel
// estaba visible" y "se reabre con un ancho guardado que ya no es valido".
export function sincronizarAnchoPanel() {
  if (!panelEl) return;
  const pct = almacenPortalView.getState().panelWidthPct;
  if (!pct || !window.innerWidth) return;
  const px = Math.round(window.innerWidth * pct);
  aplicarAnchoPanel(px);
  divisor?.setWidth(px);
}

export function mostrarPanelPortalView() {
  montar();
  const appShell = document.getElementById('app-shell');
  if (appShell) {
    if (!appShell.contains(divisor.el)) appShell.appendChild(divisor.el);
    if (!appShell.contains(panelEl)) appShell.appendChild(panelEl);
    appShell.classList.add('portal-view-open');
  }
  actualizarPanelPortalView();
}

export function ocultarPanelPortalView() {
  document.getElementById('app-shell')?.classList.remove('portal-view-open');
  if (divisor?.el.parentNode) divisor.el.parentNode.removeChild(divisor.el);
  if (panelEl?.parentNode) panelEl.parentNode.removeChild(panelEl);
}
