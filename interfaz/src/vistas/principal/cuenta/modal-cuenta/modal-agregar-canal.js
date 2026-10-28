/**
 * Modal chico para conectar TikTok/YouTube desde "Mi cuenta" > Vincular
 * cuentas: a diferencia de Twitch/Kick (OAuth real), estas dos plataformas
 * se conectan por nombre de canal, sin login (ver plataformas.js). Mismo
 * patron factory que modal-recuperar.js.
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { showToast } from '../../../../componentes/toast.js';
import { guardarYConectarCanal } from '../../plataformas.js';

const PLACEHOLDER = { tiktok: '@usuario', youtube: '@canal, Channel ID o link live' };

export function abrirModalAgregarCanal(platform) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="acTitle">
        <button class="modal-close" type="button" data-cancel><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <h2 id="acTitle" data-i18n="cuentaModal.addChannelTitle_${platform}"></h2>
        <div class="cuenta-field">
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
      overlay.remove();
      resolve(resultado);
    };

    async function guardar() {
      const valor = input.value.trim();
      if (!valor) return;
      const btn = $('[data-save]');
      btn.disabled = true;
      try {
        const r = await guardarYConectarCanal(platform, valor);
        if (!r.ok) { showToast(t('toast.invalidChannel')); return; }
        showToast(t(r.conectadoAhora ? 'toast.channelSaved' : 'toast.youtubeAutoSaved').replace('{platform}', platform));
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

    input.focus();
  });
}
