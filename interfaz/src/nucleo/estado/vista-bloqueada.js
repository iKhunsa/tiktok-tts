/**
 * Bloqueo visual + aviso de upgrade para vistas Pro enteras
 * (Sonidos, Bot, MCP). Consumido por 3 dominios de vista distintos -> vive en
 * nucleo/ (regla de modularidad: cruza dominios).
 *
 * El popup se abre solo automaticamente una vez por sesion de la app (Set en
 * memoria, no localStorage) -- cerrarlo deja la vista en modo demo bloqueado,
 * con boton propio para reabrirlo.
 */
import { almacenSesion } from './sesion.js';
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';
import { aplicarTraducciones } from '../i18n/i18n.js';

const yaMostrado = new Set();

export function aplicarBloqueoVista(elId, featureId, { autoPopup = false } = {}) {
  const s = almacenSesion.getState();
  const el = document.getElementById(elId);
  if (!el) return false;
  const bloqueada = s.activo && !s.entitlements.includes(featureId);
  el.classList.toggle('vista-bloqueada-demo', bloqueada);
  pintarOverlayBloqueo(el, bloqueada);
  // El barrido de sesión solo pinta el estado. El popup automático es una
  // consecuencia explícita de navegar a la vista, no de su visibilidad.
  if (autoPopup && bloqueada && el.offsetParent !== null && !yaMostrado.has(featureId)) {
    yaMostrado.add(featureId);
    abrirPopupPlanes();
  }
  return bloqueada;
}

/**
 * Badges "PRO" inline en markup estatico (hoy: el control "Fondo personalizado"
 * de cada card de Overlays, entitlement `overlay-decoraciones`). Se ocultan
 * cuando la feature esta desbloqueada. El gate funcional real vive en
 * subida-fondo.js#uploadBg; esto es solo el aviso visual.
 */
export function aplicarBadgesInlinePro() {
  const s = almacenSesion.getState();
  const bloqueada = s.activo && !s.entitlements.includes('overlay-decoraciones');
  document.querySelectorAll('.pro-inline-badge').forEach((b) => { b.hidden = !bloqueada; });
}

function pintarOverlayBloqueo(el, bloqueada) {
  let overlay = el.querySelector(':scope > .vista-bloqueada-overlay');
  if (bloqueada && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'vista-bloqueada-overlay';
    overlay.innerHTML =
      '<p class="vista-bloqueada-msg" data-i18n="pro.overlayMsg"></p>' +
      '<button type="button" class="vista-bloqueada-link" data-i18n="pro.upgradeCta"></button>';
    overlay.querySelector('.vista-bloqueada-link').addEventListener('click', abrirPopupPlanes);
    el.appendChild(overlay);
    aplicarTraducciones(overlay);
  } else if (!bloqueada && overlay) {
    overlay.remove();
  }
}
