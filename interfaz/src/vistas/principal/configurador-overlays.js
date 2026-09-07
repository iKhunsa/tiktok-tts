import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { setChecked } from '../../componentes/campos-formulario.js';
import { PLATFORMS } from './plataformas.js';

export function buildOverlayUrl(type) {
  const base = `${location.origin}/overlay-${type}.html`;
  const cfg = appSettings.overlays[type];
  const p = new URLSearchParams();

  if (type === 'seguidores') {
    if (cfg.goal) p.set('goal', cfg.goal);
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.80) p.set('bg', cfg.bg);
  } else if (type === 'likes') {
    if (cfg.rows && cfg.rows !== 10) p.set('rows', cfg.rows);
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.80) p.set('bg', cfg.bg);
  } else if (type === 'alertas') {
    if (cfg.dur && cfg.dur !== 4000) p.set('dur', cfg.dur);
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.90) p.set('bg', cfg.bg);
  } else if (type === 'creditos') {
    if (cfg.speed && cfg.speed !== 40) p.set('speed', cfg.speed);
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.85) p.set('bg', cfg.bg);
  } else if (type === 'social') {
    if (cfg.layout && cfg.layout !== 'cols') p.set('layout', cfg.layout);
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.80) p.set('bg', cfg.bg);
  } else if (type === 'chat') {
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.82) p.set('bg', cfg.bg);
    if (cfg.maxmsgs && cfg.maxmsgs !== 30) p.set('maxmsgs', cfg.maxmsgs);
    if (cfg.size && cfg.size !== 14) p.set('size', cfg.size);
    if (cfg.usernames === false) p.set('usernames', '0');
    const platforms = cfg.platforms || {};
    const visible = ['tiktok', 'twitch', 'youtube', 'kick'].filter((name) => platforms[name] !== false);
    if (visible.length > 0 && visible.length < PLATFORMS.length) p.set('platforms', visible.join(','));
  } else if (type === 'alertas-social') {
    if (cfg.color && cfg.color !== '#FFBB00') p.set('color', cfg.color.replace('#', ''));
    if (cfg.bg !== 0.90) p.set('bg', cfg.bg);
  }

  if (cfg && cfg.bgimg) p.set('bgimg', cfg.bgimg);

  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export function updateOverlayUrl(type) {
  const url = buildOverlayUrl(type);
  const urlEl = document.getElementById('cfg-url-' + type);
  const openEl = document.getElementById('cfg-open-' + type);
  if (urlEl) urlEl.textContent = url;
  if (openEl) openEl.href = url;
}

export function onCfgChange(type, field, value) {
  appSettings.overlays[type][field] = value;
  updateOverlayUrl(type);
  saveSettings();
}

export function onChatPlatformChange(platform, checked) {
  const chatCfg = appSettings.overlays.chat;
  chatCfg.platforms = chatCfg.platforms || { tiktok: true, twitch: true, youtube: true, kick: true };
  chatCfg.platforms[platform] = checked;
  if (!Object.values(chatCfg.platforms).some(Boolean)) {
    chatCfg.platforms[platform] = true;
    setChecked('cfg-chat-platform-' + platform, true);
    showToast(t('toast.minOnePlatform'));
  }
  updateOverlayUrl('chat');
  saveSettings();
}

export function copyCfgUrl(type) {
  navigator.clipboard
    .writeText(buildOverlayUrl(type))
    .then(() => showToast(t('toast.urlCopied')))
    .catch(() => showToast(t('toast.copyError')));
}

export function updateFollowerDisplay(count) {
  const el = document.getElementById('cfg-seg-auto');
  if (el) el.textContent = count ? Number(count).toLocaleString('es') : t('label.connectToGet');
}

export async function testGiftAlert() {
  try {
    const res = await fetch('/api/test/gift', { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t('toast.testAlertSent').replace('{name}', data.giftName));
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}

export async function testSocialAlert(eventType, platform) {
  try {
    const endpoint = eventType === 'follow'
      ? '/api/test/follow' + (platform ? `?platform=${platform}` : '')
      : '/api/test/share';
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t('toast.testSocialSent').replace('{type}', eventType).replace('{user}', data.user));
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}

export async function testAlertType(kind) {
  try {
    const res = await fetch(`/api/test/${kind}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(`Alerta de prueba: ${data.user}`);
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}

export function updateSocialOverlayUrl() {
  const followImg = (document.getElementById('cfg-social-follow-img')?.value || '').trim();
  const shareImg = (document.getElementById('cfg-social-share-img')?.value || '').trim();
  const color = document.getElementById('cfg-alertas-social-color')?.value || '#FFBB00';
  const bg = parseFloat(document.getElementById('cfg-alertas-social-bg')?.value || '0.90');
  const cfg = appSettings.overlays['alertas-social'];
  const p = new URLSearchParams();
  if (followImg) p.set('followImg', followImg);
  if (shareImg) p.set('shareImg', shareImg);
  if (color !== '#FFBB00') p.set('color', color.replace('#', ''));
  if (bg !== 0.90) p.set('bg', bg);
  if (cfg?.bgimg) p.set('bgimg', cfg.bgimg);
  cfg.color = color;
  cfg.bg = bg;
  saveSettings();
  const qs = p.toString();
  const url = `${location.origin}/overlay-alertas-social.html` + (qs ? '?' + qs : '');
  const urlEl = document.getElementById('cfg-url-social-alert');
  const openEl = document.getElementById('cfg-open-social-alert');
  if (urlEl) urlEl.textContent = url;
  if (openEl) openEl.href = url;
}

export function copySocialAlertUrl() {
  const url = document.getElementById('cfg-url-social-alert')?.textContent || 'http://localhost:3000/overlay-alertas-social.html';
  navigator.clipboard
    .writeText(url)
    .then(() => showToast(t('toast.urlCopied')))
    .catch(() => showToast(t('toast.copyError')));
}

export async function testTopLikers() {
  try {
    const res = await fetch('/api/test/likes', { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t('toast.testLikesSent').replace('{count}', data.count));
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}
