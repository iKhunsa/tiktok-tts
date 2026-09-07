import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { options } from '../../nucleo/estado/opciones-lectura.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { sendStateSync } from '../../nucleo/tts/cola-tts.js';
import { updateConnectorChipState } from './voces.js';

const CHAT_TOGGLE_CHIP_IDS = [
  'chip-chat', 'chip-gifts', 'chip-gift-amount', 'chip-joins', 'chip-follows',
  'chip-likes', 'chip-shares', 'chip-username', 'chip-nonfollowers', 'chip-username-connector',
];

/** Reconstruye el resumen de texto a partir del estado .active de cada chip. */
export function updateChatTogglesSummary() {
  const out = document.getElementById('chatTogglesSummaryText');
  if (!out) return;
  const labels = CHAT_TOGGLE_CHIP_IDS
    .map((id) => document.getElementById(id))
    .filter((chip) => chip && chip.classList.contains('active'))
    .map((chip) => chip.querySelector('span[data-i18n]')?.textContent?.trim())
    .filter(Boolean);
  out.textContent = labels.length ? labels.join(' · ') : t('chatToggles.none');
  const wrap = document.getElementById('chatTogglesSummary');
  if (wrap) wrap.classList.toggle('is-truncated', out.scrollWidth > out.clientWidth + 1);
}

export function renderChatTogglesState() {
  const box = document.getElementById('chatTogglesBox');
  const lbl = document.getElementById('chatTogglesAdjustLabel');
  if (!box) return;
  const expanded = !appSettings.chatTogglesCollapsed;
  box.classList.toggle('expanded', expanded);
  if (lbl) {
    lbl.dataset.i18n = expanded ? 'chatToggles.hide' : 'chatToggles.adjust';
    lbl.textContent = expanded ? t('chatToggles.hide') : t('chatToggles.adjust');
  }
  updateChatTogglesSummary();
}

export function toggleChatToggles() {
  appSettings.chatTogglesCollapsed = !appSettings.chatTogglesCollapsed;
  saveSettings();
  renderChatTogglesState();
}

/** Fuerza el panel expandido (lo usan los tours: driver.js no puede posicionar un popover sobre un elemento con display:none). */
export function expandChatToggles() {
  if (!appSettings.chatTogglesCollapsed) return;
  appSettings.chatTogglesCollapsed = false;
  saveSettings();
  renderChatTogglesState();
}

export function renderTwitchSectionState() {
  const sec = document.getElementById('settingsSectionTwitch');
  if (!sec) return;
  sec.classList.toggle('expanded', !appSettings.twitchSectionCollapsed);
  const hdr = document.getElementById('twitchSectionHeader');
  if (hdr) hdr.setAttribute('aria-expanded', String(!appSettings.twitchSectionCollapsed));
}

export function toggleTwitchSection() {
  appSettings.twitchSectionCollapsed = !appSettings.twitchSectionCollapsed;
  saveSettings();
  renderTwitchSectionState();
}

/** Fuerza la seccion expandida (driver.js no posiciona popovers sobre un elemento colapsado de altura cero). */
export function expandTwitchSection() {
  if (!appSettings.twitchSectionCollapsed) return;
  appSettings.twitchSectionCollapsed = false;
  saveSettings();
  renderTwitchSectionState();
}

/**
 * Un solo enganche: cualquier cambio de .active en los chips (toggleOption,
 * setReadNonFollowers, applySettings, setSoloChatMode, emergencia, remote-cmd)
 * refresca el resumen sin tocar esas funciones.
 */
export function toggleOption(key, checkbox) {
  options[key] = checkbox.checked;
  const chipId = {
    readChat: 'chip-chat', readGifts: 'chip-gifts', readGiftAmount: 'chip-gift-amount', readJoins: 'chip-joins',
    readFollows: 'chip-follows', readLikes: 'chip-likes', readShares: 'chip-shares', sayUsername: 'chip-username',
    readTwitchSub: 'chip-twitch-sub', readTwitchCheer: 'chip-twitch-cheer',
    readTwitchRaid: 'chip-twitch-raid', readTwitchFollow: 'chip-twitch-follow',
  }[key];
  if (chipId) document.getElementById(chipId)?.classList.toggle('active', checkbox.checked);
  appSettings[key] = checkbox.checked;
  saveSettings();
  sendStateSync();
  if (key === 'sayUsername') updateConnectorChipState();
}

export function setSoloChatMode() {
  const keys = ['readChat', 'readGifts', 'readJoins', 'readFollows', 'readLikes', 'readShares', 'sayUsername'];
  keys.forEach((k) => {
    options[k] = k === 'readChat';
    appSettings[k] = k === 'readChat';
    const chipId = {
      readChat: 'chip-chat', readGifts: 'chip-gifts', readJoins: 'chip-joins',
      readFollows: 'chip-follows', readLikes: 'chip-likes', readShares: 'chip-shares', sayUsername: 'chip-username',
    }[k];
    const chip = document.getElementById(chipId);
    if (chip) {
      const cb = chip.querySelector('input[type=checkbox]');
      if (cb) cb.checked = k === 'readChat';
      chip.classList.toggle('active', k === 'readChat');
    }
  });
  updateConnectorChipState();
  saveSettings();
  sendStateSync();
  showToast(t('toast.onlyChatActivated'));
}

export function iniciarObservadorTogglesChat() {
  const start = () => {
    const row = document.querySelector('#chatTogglesBox .toggles-row');
    if (!row) return;
    let raf = 0;
    new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateChatTogglesSummary);
    }).observe(row, { subtree: true, attributes: true, attributeFilter: ['class'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
