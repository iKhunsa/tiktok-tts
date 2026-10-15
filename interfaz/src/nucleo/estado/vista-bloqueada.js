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

const VIDEOS_YOUTUBE = {
  soundpad: 'WLTTEBE1yzk',
  'bot-musical': 'w9Hl7y8TVuQ',
  'panel-movil': 'jMi9gLvVP1M',
  'mcp-agente': 'Hp6oLhs-tpI',
  clips: '7weJI0r8yU8',
};
let modalBloqueo;
let featureModalBloqueo;

export function aplicarBloqueoVista(elId, featureId) {
  const s = almacenSesion.getState();
  const el = document.getElementById(elId);
  if (!el) return false;
  const bloqueada = s.activo && !s.entitlements.includes(featureId);
  el.classList.toggle('vista-bloqueada-demo', bloqueada);
  pintarOverlayBloqueo(el, bloqueada, featureId);
  return bloqueada;
}

function pintarOverlayBloqueo(el, bloqueada, featureId) {
  if (!bloqueada && featureId === featureModalBloqueo) cerrarModalBloqueo();
  if (bloqueada && el.closest('.view')?.classList.contains('active')) abrirModalBloqueo(featureId);
}

function cerrarModalBloqueo() {
  modalBloqueo?.remove();
  modalBloqueo = null;
  featureModalBloqueo = null;
}

function abrirModalBloqueo(featureId) {
  if (modalBloqueo) return;
  featureModalBloqueo = featureId;
  const videoId = VIDEOS_YOUTUBE[featureId];
  modalBloqueo = document.createElement('div');
  modalBloqueo.className = 'modal-overlay show vista-bloqueada-modal-overlay';
  modalBloqueo.innerHTML = `
    <div class="modal-content vista-bloqueada-contenido" role="dialog" aria-modal="true">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <div class="vista-bloqueada-video-wrap">
        ${videoId
    ? `<iframe class="vista-bloqueada-video" src="https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&controls=0" title="YouTube" allowfullscreen></iframe>
           <button class="vista-bloqueada-fullscreen" type="button" aria-label="Fullscreen"><img src="icons/open_in_full.svg" alt=""></button>`
    : `<div class="vista-bloqueada-video-placeholder"><img src="icons/play_arrow.svg" alt=""><span data-i18n="pro.demoVideoSoon"></span></div>`}
      </div>
      <p class="vista-bloqueada-msg" data-i18n="pro.overlayMsg"></p>
      <button type="button" class="vista-bloqueada-link" data-i18n="pro.upgradeCta"></button>
    </div>`;
  document.body.appendChild(modalBloqueo);
  aplicarTraducciones(modalBloqueo);
  modalBloqueo.addEventListener('click', (e) => { if (e.target === modalBloqueo) cerrarModalBloqueo(); });
  modalBloqueo.querySelector('.modal-close').addEventListener('click', cerrarModalBloqueo);
  modalBloqueo.querySelector('.vista-bloqueada-fullscreen')?.addEventListener('click', () => {
    void modalBloqueo.querySelector('.vista-bloqueada-video')?.requestFullscreen();
  });
  modalBloqueo.querySelector('.vista-bloqueada-link').addEventListener('click', () => {
    cerrarModalBloqueo();
    abrirPopupPlanes();
  });
}
