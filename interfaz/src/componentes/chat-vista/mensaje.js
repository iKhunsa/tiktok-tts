/**
 * Render de un mensaje del chat en vivo. Lo comparten la vista principal y la
 * ventana aparte del chat (chat-ventana.html): sin cola TTS ni moderacion.
 */
import { t } from '../../nucleo/i18n/i18n.js';
import { escaparHtml as escapeHtml, escaparAtributo } from '../../../compartido/escapar-html.js';

export const PLATAFORMAS_CHAT = ['tiktok', 'twitch', 'youtube', 'kick'];

// Emotes de terceros (BetterTTV / 7TV / FrankerFaceZ): se distinguen por el host de su imagen.
const RE_TERCEROS = /betterttv|7tv\.|frankerfacez/i;

function emoteHtml(nombre, url) {
  const cls = RE_TERCEROS.test(url) ? 'chat-emote chat-emote--3p' : 'chat-emote';
  // El texto :nombre: queda oculto; el CSS lo muestra cuando se desactivan los emotes.
  return `<img src="${escaparAtributo(url)}" alt="${escaparAtributo(nombre)}" title="${escaparAtributo(nombre)}" class="${cls}" loading="lazy"><span class="chat-emote-txt">:${escapeHtml(nombre)}:</span>`;
}

export function renderTextWithEmotes(text, emotes) {
  const safeText = String(text ?? '');
  if (!emotes || Object.keys(emotes).length === 0) return escapeHtml(safeText);
  return safeText
    .split(/(:[a-zA-Z0-9_\-]+:)/g)
    .map((part) => {
      const m = part.match(/^:([\w-]+):$/);
      if (m && emotes[m[1]]?.url) return emoteHtml(m[1], emotes[m[1]].url);
      if (emotes[part]?.url) return emoteHtml(part, emotes[part].url);
      return escapeHtml(part);
    })
    .join('');
}

const COLORS = ['#fe2c55', '#25f4ee', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b'];
const MAX_USER_COLORS = 2000;
const colorMap = new Map();

export function limpiarColoresChat() { colorMap.clear(); }

function getUserColor(user) {
  const knownColor = colorMap.get(user);
  if (knownColor) return knownColor;
  let hash = 5381;
  for (let i = 0; i < user.length; i++) hash = ((hash << 5) + hash + user.charCodeAt(i)) | 0;
  const color = COLORS[Math.abs(hash) % COLORS.length];
  if (colorMap.size >= MAX_USER_COLORS) colorMap.delete(colorMap.keys().next().value);
  colorMap.set(user, color);
  return color;
}

/**
 * @param {object} data mensaje del servidor
 * @param {string} msgId
 * @param {{onUserClick?: (e: MouseEvent, dataset: DOMStringMap) => void}} [opts]
 * @returns {{node: HTMLElement, platform: string}}
 */
export function crearNodoMensaje(data, msgId, { onUserClick } = {}) {
  const user = String(data.user || 'Usuario');
  const platform = PLATAFORMAS_CHAT.includes(String(data.platform || '').toLowerCase())
    ? String(data.platform).toLowerCase()
    : '';
  const color = getUserColor(user);
  const time = new Date(data.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = ['chat-msg', data.muted && 'chat-msg--muted', data.isAdmin && 'chat-msg--admin'].filter(Boolean).join(' ');
  div.id = msgId;
  div.dataset.plat = platform;
  div.dataset.ts = String(data.timestamp || Date.now());

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.style.background = `${color}22`;
  avatar.style.color = color;
  avatar.textContent = user.substring(0, 2).toUpperCase();

  const body = document.createElement('div');
  body.className = 'msg-body';

  const userEl = document.createElement('div');
  userEl.className = 'msg-user msg-user-clickable';
  userEl.style.color = color;
  userEl.append(document.createTextNode(`@${user}`));
  userEl.dataset.modKey = data.modKey || '';
  userEl.dataset.nick = user;
  userEl.dataset.platform = platform;
  if (onUserClick) {
    userEl.title = t('chatCtx.hint');
    userEl.onclick = (e) => onUserClick(e, userEl.dataset);
  }
  if (data.isFollower) {
    const star = document.createElement('span');
    star.className = 'chat-follower-badge';
    star.textContent = '★';
    star.title = t('chat.followerBadge');
    userEl.appendChild(star);
  }
  if (data.muted) {
    const mutedBadge = document.createElement('span');
    mutedBadge.className = 'chat-muted-badge';
    mutedBadge.textContent = '🔇';
    mutedBadge.title = t('chat.mutedBadge');
    userEl.appendChild(mutedBadge);
  }
  if (platform) {
    const badge = document.createElement('span');
    badge.className = `chat-platform-badge badge-${platform}`;
    badge.textContent = platform;
    userEl.appendChild(badge);
  }
  if (data.isAdmin) {
    const adminBadge = document.createElement('span');
    adminBadge.className = 'chat-platform-badge badge-admin';
    adminBadge.textContent = 'ADMIN';
    userEl.appendChild(adminBadge);
  }

  const textEl = document.createElement('div');
  textEl.className = 'msg-text';
  textEl.innerHTML = renderTextWithEmotes(data.comment || '', data.emotes);

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = time;

  body.append(userEl, textEl);
  div.append(avatar, body, timeEl);
  return { node: div, platform };
}
