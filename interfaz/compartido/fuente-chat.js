import { conectarWSOverlay } from './ws-cliente.js';
import { MUESTRA_CHAT } from './muestras-vista-previa.js';

/** Rol de quien escribe, como lo filtra y colorea el overlay de chat. */
export const rolDe = (mensaje) => {
  if (mensaje.isModerator) return 'moderador';
  return mensaje.isSubscriber ? 'suscriptor' : 'viewer';
};

/** La plataforma del chat si solo se muestra una (chat-tiktok, chat-twitch...), o null. */
export function plataformaUnicaDe(cfg) {
  const visibles = Object.keys(cfg.platforms).filter((plataforma) => cfg.platforms[plataforma]);
  return visibles.length === 1 ? visibles[0] : null;
}

/** Mensajes de ejemplo: en un chat de una sola plataforma salen todos de esa, asi no queda casi vacio. */
export function muestraChatDe(cfg) {
  const unica = plataformaUnicaDe(cfg);
  return unica ? MUESTRA_CHAT.map((mensaje) => ({ ...mensaje, platform: unica })) : MUESTRA_CHAT;
}

/**
 * Texto del mensaje en trozos: texto plano y emotes (`:nombre:` o la palabra exacta del emote).
 * Quien pinta decide como: el overlay arma su HTML escapado, un .epik recibe los trozos.
 */
export function partesDelTexto(texto, emotes) {
  const seguro = String(texto ?? '');
  if (!emotes || !Object.keys(emotes).length) return [{ texto: seguro }];
  return seguro.split(/(:[a-zA-Z0-9_-]+:)/g).filter(Boolean).map((parte) => {
    const nombre = parte.match(/^:([\w-]+):$/)?.[1];
    if (nombre && emotes[nombre]?.url) return { emote: nombre, url: emotes[nombre].url };
    if (emotes[parte]?.url) return { emote: parte, url: emotes[parte].url };
    return { texto: parte };
  });
}

/** Mensajes de chat del WS, comun al overlay de la app y a los .epik. alConfig(config): cambio de ajustes de la app. */
export function iniciarFuenteChat({ alMensaje, alConfig }) {
  conectarWSOverlay((d) => {
    if (d.type === 'chat') alMensaje(d);
    else if (d.type === 'config-updated') alConfig(d.config || {});
  });
}
