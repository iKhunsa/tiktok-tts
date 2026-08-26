'use strict';

/**
 * Preload aislado (contextIsolation:true, sandbox:true) de la ventana oculta
 * que carga https://kick-chat.corard.tv. Corre en el proceso de renderer con
 * acceso de solo-lectura al DOM ya montado por el script.js de corard.tv, y
 * usa MutationObserver sobre #chat-container para detectar cada mensaje
 * nuevo apenas se agrega, sin tocar el mundo aislado de la pagina.
 *
 * Selectores verificados en vivo (canal deenthegreat, 2026-08-26) contra el
 * DOM real de corard.tv:
 *   #chat-container
 *     > div.chat_line[data-id][data-sender][data-timestamp]
 *         > span.user_info > span.username (color inline, ignorado)
 *         > span.message_content
 *             (texto plano)
 *             img.emoji  (twemoji: unicode nativo, alt = caracter emoji)
 *             img.emote  (emote custom de Kick, cloudfront, sin alt/nombre)
 *
 * FRAGIL A PROPOSITO (documentado en el plan): si corard.tv cambia este
 * HTML/CSS, la captura deja de recibir mensajes en silencio — el watchdog
 * en canales/kick/stale-watchdog.js es la unica red de seguridad.
 */

const { ipcRenderer } = require('electron');

const CHAT_CONTAINER_ID = 'chat-container';
const MESSAGE_SELECTOR = '.chat_line';
const CONTENT_SELECTOR = '.message_content';

function getSlugFromArgs() {
  const arg = process.argv.find((a) => a.startsWith('--kick-slug='));
  return arg ? arg.slice('--kick-slug='.length) : null;
}

const slug = getSlugFromArgs();
const seen = new WeakSet();

function extractEmotes(contentEl) {
  const emotes = {};
  const parts = [];
  contentEl.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'IMG') return;

    if (node.classList.contains('emoji')) {
      // Twemoji: alt trae el caracter unicode original del emoji.
      parts.push(node.getAttribute('alt') || '');
      return;
    }

    // Emote custom de Kick (class="emote"): sin alt/nombre en el DOM, solo
    // la URL de cloudfront con el id del emote — se usa como nombre.
    const src = node.getAttribute('src') || '';
    const idMatch = src.match(/emotes\/(\d+)/);
    const name = idMatch ? `emote_${idMatch[1]}` : `emote_${Math.random().toString(36).slice(2, 8)}`;
    parts.push(`:${name}:`);
    if (src) emotes[name] = { url: src };
  });
  return { text: parts.join('').trim(), emotes };
}

function extractMessage(node) {
  if (!(node instanceof HTMLElement)) return null;
  const el = node.matches(MESSAGE_SELECTOR) ? node : node.querySelector(MESSAGE_SELECTOR);
  if (!el || seen.has(el)) return null;
  seen.add(el);

  const contentEl = el.querySelector(CONTENT_SELECTOR);
  if (!contentEl) return null;

  const username = (el.dataset.sender || '').trim();
  const { text, emotes } = extractEmotes(contentEl);
  if (!username || !text) return null;

  return {
    id: el.dataset.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    username,
    content: text,
    emotes,
  };
}

function sendMessage(payload) {
  ipcRenderer.send('kick:mensaje-crudo', { slug, payload });
}

function observeChatContainer() {
  const container = document.getElementById(CHAT_CONTAINER_ID);
  if (!container) {
    // corard.tv puede tardar en montar el contenedor tras la carga inicial.
    setTimeout(observeChatContainer, 500);
    return;
  }

  // El historial de chat que ya esta renderizado al conectar no es "nuevo" —
  // se marca como visto para no reproducirlo por TTS de golpe.
  container.querySelectorAll(MESSAGE_SELECTOR).forEach((el) => seen.add(el));

  ipcRenderer.send('kick:estado', { slug, state: 'observando' });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        const message = extractMessage(node);
        if (message) sendMessage(message);
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });
}

window.addEventListener('DOMContentLoaded', observeChatContainer);
