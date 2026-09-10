/**
 * Bloqueo visual (blur + overlay + popup de venta) para vistas Pro enteras
 * (Sonidos, Bot, MCP). Consumido por 3 dominios de vista distintos -> vive en
 * nucleo/ (regla de modularidad: cruza dominios).
 *
 * El popup se abre solo automaticamente una vez por sesion de la app (Set en
 * memoria, no localStorage) -- cerrarlo deja la vista en modo demo bloqueado,
 * con boton propio para reabrirlo.
 */
import { almacenSesion } from './sesion.js';
import { abrirPopupPro } from '../../componentes/popup-pro.js';
import { aplicarTraducciones } from '../i18n/i18n.js';

const yaMostrado = new Set();

export function aplicarBloqueoVista(elId, featureId) {
  const s = almacenSesion.getState();
  const el = document.getElementById(elId);
  if (!el) return false;
  const bloqueada = s.activo && !s.entitlements.includes(featureId);
  el.classList.toggle('vista-bloqueada-demo', bloqueada);
  pintarOverlayBloqueo(el, bloqueada, featureId);
  // El popup automatico solo tiene sentido si el usuario esta viendo la
  // vista de verdad (offsetParent es null mientras .view no tiene .active) --
  // sin este chequeo, cambios de sesion en cualquier otra pantalla (ej. el
  // arranque de la app, todavia deslogueada) lo dispararian de la nada.
  if (bloqueada && el.offsetParent !== null && !yaMostrado.has(featureId)) {
    yaMostrado.add(featureId);
    abrirPopupPro(featureId);
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

function pintarOverlayBloqueo(el, bloqueada, featureId) {
  let overlay = el.querySelector(':scope > .vista-bloqueada-overlay');
  if (bloqueada && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'vista-bloqueada-overlay';
    overlay.innerHTML =
      '<p class="vista-bloqueada-msg" data-i18n="pro.overlayMsg"></p>' +
      '<button type="button" class="cuenta-btn-primary vista-bloqueada-btn" data-i18n="pro.overlayBtn"></button>';
    overlay.querySelector('.vista-bloqueada-btn').addEventListener('click', () => abrirPopupPro(featureId));
    el.appendChild(overlay);
    aplicarTraducciones(overlay);
  } else if (!bloqueada && overlay) {
    overlay.remove();
  }
}
