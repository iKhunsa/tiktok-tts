/**
 * Modal chico para conectar TikTok/YouTube desde "Mi cuenta" > Vincular
 * cuentas: a diferencia de Twitch/Kick (OAuth real), estas dos plataformas
 * se conectan por nombre de canal, sin login (ver plataformas.js). Mismo
 * patron factory que modal-recuperar.js.
 *
 * Solo GUARDA el canal -- nunca conecta al LIVE de una (eso es "Conectar"/
 * "Conectar todo" en Chat, ver guardarCanal en plataformas.js).
 *
 * Para TikTok ademas hace falta login (cookies de la cuenta, separado del
 * nombre de canal): reemplaza el campo por el prompt de login mientras no
 * haya sesion, igual que el viejo formulario de Ajustes (ver nota de
 * tiktok-sesion.js) -- se escucha alCambiarSesionTiktok() para refrescarse
 * sola si la ventana de login/logout termina mientras el modal esta abierto.
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { showToast } from '../../../../componentes/toast.js';
import { guardarCanal, PLATFORM_LABELS } from '../../plataformas.js';
import { fetchTiktokSession, alCambiarSesionTiktok, tiktokLogin, tiktokLogout } from '../../tiktok-sesion.js';

// TikTok lleva el "@" como prefijo fijo del campo; YouTube acepta tambien
// Channel ID o link, asi que ahi no hay prefijo.
const PLACEHOLDER = { tiktok: 'usuario', youtube: '@canal, Channel ID o link live' };

export function abrirModalAgregarCanal(platform) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content ac-modal" role="dialog" aria-modal="true" aria-labelledby="acTitle" aria-describedby="acSub">
        <button class="modal-close" type="button" data-cancel><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <div class="ac-cabecera">
          <span class="ac-logo" aria-hidden="true"><img src="icons/${esc(platform)}-logo.svg" alt=""></span>
          <h2 id="acTitle" data-i18n="cuentaModal.addChannelTitle_${platform}"></h2>
          <p id="acSub" class="ac-sub" data-i18n="cuentaModal.addChannelSub_${platform}"></p>
        </div>
        ${platform === 'tiktok' ? '<div data-tiktok-session hidden></div>' : ''}
        <div class="ac-campo" data-channel-row>
          <label for="acInput" data-i18n="cuentaModal.addChannelLabel"></label>
          <div class="ac-input">
            ${platform === 'tiktok' ? '<span class="ac-prefijo" aria-hidden="true">@</span>' : ''}
            <input type="text" id="acInput" placeholder="${esc(PLACEHOLDER[platform] || '@usuario')}" autocomplete="off">
          </div>
        </div>
        <button type="button" class="cuenta-btn-primary ac-guardar" data-save data-i18n="btn.saveChannel"></button>
      </div>`;
    document.body.appendChild(overlay);
    aplicarTraducciones(overlay);

    const $ = (sel) => overlay.querySelector(sel);
    const input = $('#acInput');
    let hecho = false;
    const cerrar = (resultado) => {
      if (hecho) return;
      hecho = true;
      desuscribirSesion?.();
      overlay.remove();
      resolve(resultado);
    };

    async function guardar() {
      const valor = input.value.trim();
      if (!valor) return;
      const btn = $('[data-save]');
      btn.disabled = true;
      try {
        const r = await guardarCanal(platform, valor);
        if (!r.ok) { showToast(t('toast.invalidChannel')); return; }
        showToast(platform === 'youtube' && !r.autoConnect ? t('toast.youtubeTmpSaved') : t('toast.platformLinked', { platform: PLATFORM_LABELS[platform] }));
        cerrar(true);
      } finally {
        btn.disabled = false;
      }
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(false); });
    $('[data-cancel]').addEventListener('click', () => cerrar(false));
    $('[data-save]').addEventListener('click', guardar);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') guardar(); });

    let desuscribirSesion;
    if (platform === 'tiktok') {
      desuscribirSesion = alCambiarSesionTiktok(() => pintarSesionTiktok(overlay));
      pintarSesionTiktok(overlay);
    } else {
      input.focus();
    }
  });
}

async function pintarSesionTiktok(overlay) {
  if (!overlay.isConnected) return;
  const slot = overlay.querySelector('[data-tiktok-session]');
  const channelRow = overlay.querySelector('[data-channel-row]');
  const saveBtn = overlay.querySelector('[data-save]');
  const session = await fetchTiktokSession();
  if (!overlay.isConnected) return;

  if (!session.available) {
    // Paquete sin soporte de sesion (o corriendo fuera de Electron): sin
    // login posible, se cae al campo de canal solo (igual que siempre).
    slot.hidden = true;
    return;
  }

  slot.hidden = false;
  const necesitaLogin = !session.loggedIn;
  channelRow.style.display = necesitaLogin ? 'none' : '';
  saveBtn.style.display = necesitaLogin ? 'none' : '';
  const sub = overlay.querySelector('#acSub');
  sub.dataset.i18n = necesitaLogin ? 'cuentaModal.addChannelSub_tiktokLogin' : 'cuentaModal.addChannelSub_tiktok';
  aplicarTraducciones(sub.parentElement);

  if (necesitaLogin) {
    slot.innerHTML = `
      <ol class="ac-pasos">
        <li class="ac-paso">
          <span class="ac-paso-num" aria-hidden="true">1</span>
          <div><strong data-i18n="conn.tiktokLogin"></strong><span data-i18n="conn.tiktokLoginStepOneDesc"></span></div>
        </li>
        <li class="ac-paso">
          <span class="ac-paso-num" aria-hidden="true">2</span>
          <div><strong data-i18n="cuentaModal.stepAddTitle"></strong><span data-i18n="cuentaModal.stepAddDesc"></span></div>
        </li>
      </ol>
      <button type="button" class="cuenta-btn-primary ac-guardar ac-login" data-tiktok-login>
        <img src="icons/login.svg" alt=""> <span data-i18n="conn.tiktokLogin"></span>
      </button>`;
    aplicarTraducciones(slot);
    slot.querySelector('[data-tiktok-login]').addEventListener('click', tiktokLogin);
  } else {
    slot.innerHTML = `
      <div class="ac-sesion">
        <span class="ac-sesion-punto" aria-hidden="true"></span>
        <span data-i18n="cuentaModal.sessionActive"></span>
        <button type="button" class="ac-sesion-salir" data-tiktok-logout data-i18n-title="conn.tiktokLogout" data-i18n-aria-label="conn.tiktokLogout"><img src="icons/exit_to_app.svg" alt=""></button>
      </div>`;
    aplicarTraducciones(slot);
    slot.querySelector('[data-tiktok-logout]').addEventListener('click', tiktokLogout);
    overlay.querySelector('#acInput').focus();
  }
}
