import { t } from '../../nucleo/i18n/i18n.js';
import { escaparHtml as escapeHtml } from '../../../compartido/escapar-html.js';
import { options } from '../../nucleo/estado/opciones-lectura.js';
import { CHAT_TTS_MAX_LEN } from '../../nucleo/estado/config-runtime.js';
import { getSayUsernameConnector } from './modales-avisos.js';
import { openUserMenu } from './moderacion.js';
import { currentMsgId, speak, stopCurrentTTS, resetTtsCounters, updateQueueBadge } from '../../nucleo/tts/cola-tts.js';
import { likeCooldownMap } from '../../nucleo/ws/cliente-ws.js';

// speak/currentMsgId/stopCurrentTTS/resetTtsCounters/updateQueueBadge
// viven en cola-tts.js; msgCount vive aca (es contador de mensajes de UI,
// no de la cola TTS — se reinicia al limpiar el chat, no al vaciar la cola).
export let msgCount = 0;
export function incrementarMsgCount() { msgCount++; return msgCount; }
export function resetearMsgCount() { msgCount = 0; }

export { escapeHtml };

export function renderTextWithEmotes(text, emotes) {
  if (!emotes || Object.keys(emotes).length === 0) return escapeHtml(text);
  const parts = text.split(/(:[a-zA-Z0-9_\-]+:)/g);
  return parts
    .map((part) => {
      const m = part.match(/^:([\w-]+):$/);
      if (m && emotes[m[1]]?.url) {
        return `<img src="${escapeHtml(emotes[m[1]].url)}" alt="${escapeHtml(m[1])}" title="${escapeHtml(m[1])}" class="chat-emote" loading="lazy">`;
      }
      if (emotes[part]?.url) {
        return `<img src="${escapeHtml(emotes[part].url)}" alt="${escapeHtml(part)}" title="${escapeHtml(part)}" class="chat-emote" loading="lazy">`;
      }
      return escapeHtml(part);
    })
    .join('');
}

const COLORS = ['#fe2c55', '#25f4ee', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b'];
const colorMap = {};

function getUserColor(user) {
  if (!colorMap[user]) {
    let hash = 5381;
    for (let i = 0; i < user.length; i++) hash = ((hash << 5) + hash + user.charCodeAt(i)) | 0;
    colorMap[user] = COLORS[Math.abs(hash) % COLORS.length];
  }
  return colorMap[user];
}

// ─── Scroll que sigue la lectura ───────────────────────────────
// Con seguimiento activo el chat persigue al mensaje que el TTS esta
// leyendo, no al ultimo recibido: en un directo movido la cola va varios
// mensajes por detras del fondo. Sin nada leyendose, sigue al fondo.
// Scrollear hacia arriba lo pausa; volver al fondo lo reanuda.
const CHAT_STICK_PX = 60;
const CHAT_SELF_SCROLL_MS = 200;

let chatFollow = true;
let chatSelfScrollAt = 0;

function chatIsAtBottom() {
  const log = document.getElementById('chatLog');
  if (!log) return true;
  return log.scrollHeight - log.scrollTop - log.clientHeight <= CHAT_STICK_PX;
}

function chatSpeakingEl() {
  return currentMsgId ? document.getElementById(currentMsgId) : null;
}

function chatScrollTo(fn) {
  chatSelfScrollAt = performance.now();
  fn();
}

/** Lleva la vista al mensaje en lectura. cola-tts.js la llama al empezar cada mensaje nuevo. */
export function chatFollowSpeaking() {
  if (!chatFollow) return;
  const el = chatSpeakingEl();
  const log = document.getElementById('chatLog');
  if (!log) return;
  if (el) chatScrollTo(() => el.scrollIntoView({ block: 'center' }));
  else chatScrollTo(() => { log.scrollTop = log.scrollHeight; });
}

function appendChatNode(node) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  log.appendChild(node);
  chatFollowSpeaking();
}

function chatPauseFollow() {
  chatFollow = false;
}

export function initChatScrollFollow() {
  const log = document.getElementById('chatLog');
  if (!log) return;
  let lastTop = log.scrollTop;
  log.addEventListener('scroll', () => {
    const top = log.scrollTop;
    const wentUp = top < lastTop;
    lastTop = top;
    if (performance.now() - chatSelfScrollAt < CHAT_SELF_SCROLL_MS) return;
    if (wentUp) chatPauseFollow();
    else if (chatIsAtBottom()) chatFollow = true;
  }, { passive: true });
  log.addEventListener('wheel', (e) => { if (e.deltaY < 0) chatPauseFollow(); }, { passive: true });
}

export function addChatMsg(data, msgId) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();

  const user = String(data.user || 'Usuario');
  const platform = ['tiktok', 'twitch', 'youtube', 'kick'].includes(String(data.platform || '').toLowerCase())
    ? String(data.platform).toLowerCase()
    : '';
  const color = getUserColor(user);
  const time = new Date(data.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const initials = user.substring(0, 2).toUpperCase();

  const div = document.createElement('div');
  div.className = ['chat-msg', data.muted && 'chat-msg--muted', data.isAdmin && 'chat-msg--admin'].filter(Boolean).join(' ');
  div.id = msgId;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.style.background = `${color}22`;
  avatar.style.color = color;
  avatar.textContent = initials;

  const body = document.createElement('div');
  body.className = 'msg-body';

  const userEl = document.createElement('div');
  userEl.className = 'msg-user msg-user-clickable';
  userEl.style.color = color;
  userEl.append(document.createTextNode(`@${user}`));
  userEl.dataset.modKey = data.modKey || '';
  userEl.dataset.nick = user;
  userEl.dataset.platform = platform;
  userEl.title = t('chatCtx.hint');
  userEl.onclick = (e) => openUserMenu(e, userEl.dataset);
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

  body.appendChild(userEl);
  body.appendChild(textEl);
  div.appendChild(avatar);
  div.appendChild(body);
  div.appendChild(timeEl);

  appendChatNode(div);
}

export function addSystemMsg(text, type, msgId, { iconSrc = '', accentText = '' } = {}) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `chat-msg${type === 'gift' ? ' gift-msg' : ''}`;
  div.id = msgId;
  div.style.opacity = '0.7';
  const body = document.createElement('div');
  body.className = 'msg-body';
  const txt = document.createElement('div');
  txt.className = 'msg-text';
  txt.style.fontSize = '13px';
  if (iconSrc) {
    const icon = document.createElement('img');
    icon.className = 'icon-inline';
    icon.src = iconSrc;
    icon.alt = '';
    txt.appendChild(icon);
    txt.appendChild(document.createTextNode(' '));
  }
  txt.appendChild(document.createTextNode(String(text || '')));
  if (accentText) {
    txt.appendChild(document.createTextNode(' '));
    const accent = document.createElement('span');
    accent.style.color = 'var(--accent)';
    accent.style.fontSize = '11px';
    accent.textContent = accentText;
    txt.appendChild(accent);
  }
  body.appendChild(txt);
  div.appendChild(body);

  appendChatNode(div);
}

export function clearChat() {
  stopCurrentTTS({ clearQueue: true });
  resetTtsCounters();
  document.getElementById('chatLog').innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="empty-icon"><img class="icon-inline" src="icons/mic.svg" alt=""></div>
      <div class="empty-text">${t('chat.cleared')}</div>
    </div>`;
  resetearMsgCount();
  document.getElementById('msgCount').textContent = '0';
  chatFollow = true;
  likeCooldownMap.clear();
  updateQueueBadge();
}

export function handleChatData(data, chatId) {
  addChatMsg(data, chatId);
  if (options.readChat && !data.ttsBlocked) {
    const ttsBase = typeof data.ttsComment === 'string' ? data.ttsComment : data.comment;
    if (!ttsBase || !ttsBase.trim()) return;
    let raw;
    if (!options.sayUsername) {
      raw = ttsBase;
    } else {
      const connector = getSayUsernameConnector();
      raw = connector ? `${data.user} ${connector} ${ttsBase}` : `${data.user}: ${ttsBase}`;
    }
    const text = raw.length > CHAT_TTS_MAX_LEN ? raw.substring(0, CHAT_TTS_MAX_LEN) : raw;
    speak(text, chatId, data.timestamp);
  }
}
