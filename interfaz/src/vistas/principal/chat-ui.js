import { t } from '../../nucleo/i18n/i18n.js';
import { nombreHablado } from '../../nucleo/i18n/nombre-hablado.js';
import { escaparHtml as escapeHtml } from '../../../compartido/escapar-html.js';
import { crearNodoMensaje, renderTextWithEmotes, limpiarColoresChat } from '../../componentes/chat-vista/mensaje.js';
import { crearGestorLog } from '../../componentes/chat-vista/columnas.js';
import { difundirMensaje, difundirLimpiar } from '../../componentes/chat-vista/canal.js';
import { options } from '../../nucleo/estado/opciones-lectura.js';
import { CHAT_TTS_MAX_LEN, announceTemplates } from '../../nucleo/estado/config-runtime.js';
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

export { escapeHtml, renderTextWithEmotes };

// Un unico gestor del log: vista unificada o dividida por plataforma.
let gestorLog = null;
export function gestorChat() {
  return (gestorLog ??= crearGestorLog(document.getElementById('chatLog')));
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

function appendChatNode(node, plataforma) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  const contenedor = gestorChat().agregar(node, plataforma);
  if (contenedor === log) podarChat(log); // en vista dividida poda cada columna el gestor
  chatFollowSpeaking();
}

// Tope de nodos del log: sin el, una sesion larga acumula decenas de miles
// de mensajes en el DOM. Si el usuario esta leyendo hacia arriba se
// compensa el scroll con la altura podada para que la vista no salte.
const MAX_CHAT_NODES = 300;

function podarChat(log) {
  let altoPodado = 0;
  while (log.childElementCount > MAX_CHAT_NODES) {
    const primero = log.firstElementChild;
    if (!chatFollow) altoPodado += primero.offsetHeight;
    primero.remove();
  }
  if (altoPodado) {
    const behavior = log.style.scrollBehavior;
    log.style.scrollBehavior = 'auto'; // #chatLog es smooth: sin esto la compensacion se anima
    chatSelfScrollAt = performance.now();
    log.scrollTop = Math.max(0, log.scrollTop - altoPodado);
    log.style.scrollBehavior = behavior;
  }
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

/** Boton del banner #speakingNow: centra el mensaje en lectura y lo resalta. */
export function initSpeakingGoto() {
  const btn = document.getElementById('speakingGoto');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const el = chatSpeakingEl();
    if (!el) { btn.disabled = true; return; } // purgado por el tope de nodos
    chatScrollTo(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    el.classList.remove('goto-flash');
    void el.offsetWidth; // reinicia la animacion si se pulsa dos veces
    el.classList.add('goto-flash');
    setTimeout(() => el.classList.remove('goto-flash'), 1200);
  });
}

export function addChatMsg(data, msgId) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();
  const { node, platform } = crearNodoMensaje(data, msgId, { onUserClick: openUserMenu });
  appendChatNode(node, platform);
  difundirMensaje(data, msgId);
}

export function addSystemMsg(text, type, msgId, { iconSrc = '', accentText = '' } = {}) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `chat-msg${type === 'gift' ? ' gift-msg' : ''}`;
  div.id = msgId;
  div.dataset.ts = String(Date.now());
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

export function clearChatAndQueue() {
  stopCurrentTTS({ clearQueue: true });
  resetTtsCounters();
  document.getElementById('chatLog').innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="empty-icon"><img class="icon-inline" src="icons/mic.svg" alt=""></div>
      <div class="empty-text">${t('chat.cleared')}</div>
    </div>`;
  resetearMsgCount();
  limpiarColoresChat();
  gestorChat().reiniciar();
  difundirLimpiar();
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
      const base = getSayUsernameConnector();
      const connector = base && (announceTemplates.chat || base); // palabra propia si la hay
      const usuario = nombreHablado(data);
      raw = connector ? `${usuario} ${connector} ${ttsBase}` : `${usuario}: ${ttsBase}`;
    }
    const text = raw.length > CHAT_TTS_MAX_LEN ? raw.substring(0, CHAT_TTS_MAX_LEN) : raw;
    speak(text, chatId, data.timestamp);
  }
}
