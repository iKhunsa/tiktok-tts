/**
 * Ajustes > Gate por donacion (reemplazo del viejo "solo seguidores", ver
 * CLAUDE.md). Config plana en servicio-cuentas... no, en config.json local
 * (features/configuracion/), 6 claves ya validadas server-side
 * (ttsGiftGate{Tiktok,Twitch,Kick}{Enabled,Min*}) — este modulo solo hidrata
 * y patchea, sin store propio: son 3 bloques independientes sin estado
 * derivado entre si.
 */
import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { patchConfigSetting } from '../voces.js';

const PLATFORMS = [
  { id: 'tiktok', icon: 'tiktok-logo.svg', enabledKey: 'ttsGiftGateTiktokEnabled', minKey: 'ttsGiftGateTiktokMinCoins', unitKey: 'giftGate.unit.coins' },
  { id: 'twitch', icon: 'twitch-logo.svg', enabledKey: 'ttsGiftGateTwitchEnabled', minKey: 'ttsGiftGateTwitchMinBits', unitKey: 'giftGate.unit.bits' },
  { id: 'kick', icon: 'kick-logo.svg', enabledKey: 'ttsGiftGateKickEnabled', minKey: 'ttsGiftGateKickMinKicks', unitKey: 'giftGate.unit.kicks' },
];

const platformBlock = ({ id, icon }) => `
  <div class="cg-card gg-platform" data-gg-platform="${id}">
    <div class="cg-master">
      <img class="icon-inline cg-master-icon gg-platform-icon" src="icons/${icon}" alt="">
      <div class="cg-master-text">
        <div class="cg-master-title" id="ggLabel-${id}" data-i18n="giftGate.${id}.title"></div>
        <div class="cg-hint" data-i18n="giftGate.${id}.desc"></div>
      </div>
      <button type="button" class="cg-switch" role="switch" aria-checked="false"
        aria-labelledby="ggLabel-${id}" data-gg-toggle="${id}">
        <span class="cg-switch-thumb"></span>
      </button>
    </div>
    <div class="gg-threshold">
      <label for="ggMin-${id}" data-i18n="giftGate.minLabel"></label>
      <div class="gg-input-wrap">
        <input type="number" id="ggMin-${id}" class="gg-input" min="1" step="1" inputmode="numeric" data-gg-input="${id}">
        <span class="gg-unit" data-i18n="${PLATFORMS.find((p) => p.id === id).unitKey}"></span>
      </div>
    </div>
  </div>`;

const TEMPLATE = `
  <div class="settings-section-title"><img class="icon-inline" src="icons/card_giftcard.svg" alt=""> <span data-i18n="giftGate.title"></span></div>
  <p class="cg-hint cg-intro" data-i18n="giftGate.desc"></p>
  ${PLATFORMS.map(platformBlock).join('')}`;

let root = null;

function setBlockState(platform, enabled) {
  const block = root.querySelector(`[data-gg-platform="${platform.id}"]`);
  const button = block.querySelector('.cg-switch');
  const input = block.querySelector('.gg-input');
  button.setAttribute('aria-checked', String(enabled));
  input.disabled = !enabled;
  block.classList.toggle('gg-platform-off', !enabled);
}

function hydrate(cfg) {
  for (const platform of PLATFORMS) {
    const block = root.querySelector(`[data-gg-platform="${platform.id}"]`);
    const input = block.querySelector('.gg-input');
    const min = Number(cfg[platform.minKey]);
    input.value = Number.isInteger(min) && min >= 1 ? min : 1;
    setBlockState(platform, !!cfg[platform.enabledKey]);
  }
}

export function applyGiftGate(cfg) {
  if (!root || !cfg) return;
  hydrate(cfg);
}

export function initGiftGate() {
  const container = document.getElementById('giftGatePanel');
  if (!container || root) return;
  root = container;
  root.innerHTML = TEMPLATE;
  aplicarTraducciones(root);

  for (const platform of PLATFORMS) {
    const block = root.querySelector(`[data-gg-platform="${platform.id}"]`);
    const button = block.querySelector('.cg-switch');
    const input = block.querySelector('.gg-input');

    button.addEventListener('click', () => {
      const enabled = button.getAttribute('aria-checked') !== 'true';
      setBlockState(platform, enabled);
      patchConfigSetting({ [platform.enabledKey]: enabled });
    });

    input.addEventListener('change', () => {
      const value = Math.max(1, Math.round(Number(input.value)) || 1);
      input.value = value;
      patchConfigSetting({ [platform.minKey]: value });
    });
  }

  fetch('/api/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => cfg && hydrate(cfg))
    .catch(() => { /* config no disponible aun; config-updated por WS la trae despues */ });
}

