/**
 * Bloqueo visual + aviso de upgrade para vistas Pro enteras
 * (Sonidos, Bot, MCP). Consumido por 3 dominios de vista distintos -> vive en
 * nucleo/ (regla de modularidad: cruza dominios).
 *
 * El aviso deja la vista en modo demo bloqueado, con boton propio para abrir
 * la comparacion de planes.
 */
import { almacenSesion } from './sesion.js';
import { abrirPopupPlanes } from '../../componentes/popup-planes.js';
import { aplicarTraducciones } from '../i18n/i18n.js';

export function aplicarBloqueoVista(elId, featureId) {
  const s = almacenSesion.getState();
  const el = document.getElementById(elId);
  if (!el) return false;
  const bloqueada = s.activo && !s.entitlements.includes(featureId);
  el.classList.toggle('vista-bloqueada-demo', bloqueada);
  pintarOverlayBloqueo(el, bloqueada, featureId);
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
      `<div class="vista-bloqueada-video-wrap">
        <div class="vista-bloqueada-video-placeholder">
          <img src="icons/play_arrow.svg" alt="">
          <span data-i18n="pro.demoVideoSoon"></span>
        </div>
        <video class="vista-bloqueada-video" src="videos/demo-${featureId}.mp4" muted loop playsinline controls></video>
      </div>` +
      '<p class="vista-bloqueada-msg" data-i18n="pro.overlayMsg"></p>' +
      '<button type="button" class="vista-bloqueada-link" data-i18n="pro.upgradeCta"></button>';
    overlay.querySelector('.vista-bloqueada-video').addEventListener('loadeddata', (e) => {
      e.currentTarget.closest('.vista-bloqueada-video-wrap').classList.add('cargado');
    });
    overlay.querySelector('.vista-bloqueada-link').addEventListener('click', abrirPopupPlanes);
    el.appendChild(overlay);
    aplicarTraducciones(overlay);
  } else if (!bloqueada && overlay) {
    overlay.remove();
  }
}
