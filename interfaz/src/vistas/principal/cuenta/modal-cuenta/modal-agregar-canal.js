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

const PLACEHOLDER = { tiktok: '@usuario', youtube: '@canal, Channel ID o link live' };

export function abrirModalAgregarCanal(platform) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="acTitle">
        <button class="modal-close" type="button" data-cancel><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <h2 id="acTitle" data-i18n="cuentaModal.addChannelTitle_${platform}"></h2>
        ${platform === 'tiktok' ? '<div class="cuenta-field" data-tiktok-session hidden></div>' : ''}
        <div class="cuenta-field" data-channel-row>
          <label for="acInput" data-i18n="cuentaModal.addChannelLabel"></label>
          <input type="text" id="acInput" placeholder="${esc(PLACEHOLDER[platform] || '@usuario')}" autocomplete="off">
        </div>
        <button type="button" class="cuenta-btn-primary" data-save data-i18n="btn.saveChannel"></button>
        <button type="button" class="cuenta-btn-ghost" data-cancel-inline data-i18n="btn.cancel"></button>
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
        showToast(platform === 'youtube' && !r.autoConnect ? t('toast.youtubeTmpSaved') : t('toast.channelSaved').replace('{platform}', PLATFORM_LABELS[platform]));
        cerrar(true);
      } finally {
        btn.disabled = false;
      }
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(false); });
    $('[data-cancel]').addEventListener('click', () => cerrar(false));
    $('[data-cancel-inline]').addEventListener('click', () => cerrar(false));
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

  if (necesitaLogin) {
    slot.innerHTML = `
      <div class="tiktok-login-flow">
        <div class="tiktok-login-step">
          <span class="tiktok-login-badge">1</span>
          <div>
            <strong data-i18n="conn.tiktokLogin"></strong>
            <span data-i18n="conn.tiktokLoginStepOneDesc"></span>
          </div>
        </div>
        <div class="tiktok-login-step tiktok-login-step-two">
          <span class="tiktok-login-badge">2</span>
          <div>
            <strong data-i18n="conn.tiktokLoginStepTwoTitle"></strong>
            <span data-i18n-html="conn.tiktokLoginStepTwoDesc"></span>
          </div>
        </div>
      </div>
      <button type="button" class="btn-supabase-primary ac-tiktok-login-btn" data-tiktok-login>
        <img class="icon-inline" src="icons/login.svg" alt=""> <span data-i18n="conn.tiktokLogin"></span>
      </button>`;
    aplicarTraducciones(slot);
    slot.querySelector('[data-tiktok-login]').addEventListener('click', tiktokLogin);
  } else {
    slot.innerHTML = `
      <div class="canales-session-row" style="display:flex;">
        <img class="icon-inline" src="icons/tiktok.svg" alt="">
        <span data-i18n="conn.tiktokSessionActive"></span>
        <button type="button" class="cfg-btn small icon-only" data-tiktok-logout data-i18n-title="conn.tiktokLogout" title="Cerrar sesión de TikTok"><img class="icon-inline" src="icons/exit_to_app.svg" alt=""></button>
      </div>`;
    aplicarTraducciones(slot);
    slot.querySelector('[data-tiktok-logout]').addEventListener('click', tiktokLogout);
  }
}
