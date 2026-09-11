'use strict';

const { resolveDisplayName } = require('./resolve-display-name');
const { cleanName } = require('./clean-name');
const { sanitizeForTTS } = require('./sanitize-for-tts');
const { normalizeForModeration } = require('./normalize-for-moderation');
const { isAdminIdentity } = require('./is-admin-identity');
const { normalizeAggressive } = require('./normalize-aggressive');
const moderacionPolicyContract = require('../../core/contracts/moderacion-policy');
const { ADMIN_ANNOUNCE_TEXT, pickAnnounceText } = require('../../core/announce-texts');

// Global (no por plataforma): si el creador transmite simultaneo en 4
// plataformas y escribe en todas, el aviso debe sonar una sola vez, no una
// por cada plataforma donde se detecto su identidad admin. Se resetea cuando
// se cae el ultimo canal conectado (ver chat/index.js#register, listener de
// canal:estado) para que una desconexion total + reconexion cuente como
// sesion nueva y vuelva a anunciar.
let adminAnnounced = false;

function resetAdminAnnounce() {
  adminAnnounced = false;
}

// Dedup del broadcast: cuando un conector reconecta, la libreria reentrega su
// buffer de mensajes recientes como 'chat' nuevos (hasta decenas por segundo).
// Sin esto, el TTS repite el chat de los ultimos minutos.
//
// La clave NUNCA usa Date.now() (nuestra hora de recepcion — el replay la
// re-estampa al reconectar). Usa el timestamp/id que la PLATAFORMA le puso al
// mensaje en origen: identico para un mensaje replayeado, distinto para un
// re-envio legitimo del mismo texto (un user mandando "hola" o "!p <cancion>"
// dos veces). Ver buildDedupKey() para la clave exacta por plataforma.
//
// Con un ts/id de origen en la clave la ventana de 10 min es segura. Cuando una
// plataforma no expone ninguno se cae a `platform:userId:texto` (sin ts): ahi el
// dedup puede tragarse una repeticion legitima exacta dentro de la ventana — es
// el mismo tradeoff que ya existia y la rama casi no se ejercita (las 4
// plataformas normalmente traen su id/ts).
// ponytail: ventana 10min/2000, subir si hay reportes de replay que se cuela.
const DEDUP_WINDOW_MS = 10 * 60 * 1000;
const DEDUP_MAX = 2000;
const seenMessages = new Map(); // key -> epoch ms de la primera emision

function resetDedup() {
  seenMessages.clear();
}

// true = ya visto dentro de la ventana (descartar). Registra la clave si es nueva.
function isDuplicateMessage(key, now) {
  const prev = seenMessages.get(key);
  if (prev !== undefined && now - prev < DEDUP_WINDOW_MS) return true;
  seenMessages.set(key, now);
  if (seenMessages.size > DEDUP_MAX) {
    seenMessages.delete(seenMessages.keys().next().value);
  }
  return false;
}

// Clave de dedup por plataforma. El discriminador es SIEMPRE el id/ts que la
// plataforma asigno al mensaje en origen, nunca nuestra hora de recepcion.
// Todos son estables en el replay: el catch-up del WS re-entrega los mismos
// protobufs bufferados desde el cursor, no regenera campos.
//   - tiktok:  raw.msgId — id de mensaje del server, unico por mensaje. Lo
//              aplana tiktok-live-connector desde common.msgId (mismo Object.assign
//              del bloque `common` que trae createTime). NO se usa createTime como
//              discriminador: es un int64 que se repite entre mensajes del mismo
//              frame — colapsaria dos mensajes legitimos distintos del mismo user
//              con el mismo texto normalizado ("jaja", "!p", un emote repetido).
//   - kick:    raw.id      — id de mensaje de server.
//   - youtube: raw.id (item.id).
//   - twitch:  raw.tags.id — UUID por mensaje del tag IRCv3. Fallback:
//              tmi-sent-ts + texto (epoch ms unico por mensaje).
// Sin ninguno de esos → fallback `platform:userId:texto` (mismo tradeoff previo:
// puede tragarse una repeticion exacta; rama casi nunca alcanzada).
function buildDedupKey(platform, raw, userKey, normalizedText) {
  if (platform === 'tiktok' && raw.msgId && raw.msgId !== '0') {
    return `tiktok:id:${raw.msgId}`;
  }
  if (platform === 'kick' && raw.id) {
    return `kick:id:${raw.id}`;
  }
  if (platform === 'youtube' && raw.id) {
    return `youtube:id:${raw.id}`;
  }
  const tw = platform === 'twitch' && raw.tags ? raw.tags : null;
  if (tw && tw.id) {
    return `twitch:id:${tw.id}`;
  }
  if (tw && tw['tmi-sent-ts']) {
    return `twitch:${userKey}:${tw['tmi-sent-ts']}:${normalizedText}`;
  }
  if (platform === 'tiktok' && raw.createTime) {
    // msgId ausente (raro): createTime + texto es el mejor discriminador que queda.
    return `tiktok:${userKey}:${raw.createTime}:${normalizedText}`;
  }
  return `${platform}:${userKey}:${normalizedText}`;
}

// Los "emojis de TikTok" (set propio: [Happy], [Smile], [Loveface]...) llegan
// dentro de `comment` como palabras entre corchetes, no como emoji unicode —
// sanitizeForTTS no los toca porque son letras. Se quitan del texto que lee el
// TTS (no del que se muestra en el chat, ahi el corchete es el fallback que
// usa la propia app de TikTok). El emoji unicode nativo si lo filtra sanitize.
const TIKTOK_EMOTE_TOKEN = /\[[A-Za-z]{1,20}\]/g;

function stripTiktokEmoteTokens(text) {
  return text.replace(TIKTOK_EMOTE_TOKEN, ' ');
}

function extractTiktokMessage(raw) {
  const comment = String(raw.comment || '').trim();
  if (!comment) return null;
  return {
    user: resolveDisplayName(raw.nickname, raw.uniqueId),
    userId: raw.uniqueId || null,
    // Identidad admin: SIEMPRE el uniqueId (@handle), nunca `user` (nickname
    // libre, spoofeable — ver bug de is-admin-identity.js). Mismo valor que
    // userId acá, explícito para no confundirlo con el nickname de arriba.
    stableHandle: raw.uniqueId || null,
    comment: sanitizeForTTS(comment),
    // Siempre string (aunque quede vacio si el mensaje era solo emojis de
    // TikTok) — nunca undefined, para que el front no caiga de vuelta a
    // `comment` y termine leyendo `[Happy]` en voz alta.
    ttsComment: sanitizeForTTS(stripTiktokEmoteTokens(comment)),
    emotes: undefined,
    ytMsgId: undefined,
  };
}

function extractTwitchMessage(raw) {
  const tags = raw.tags || {};
  const text = String(raw.message || '').trim();
  if (!text) return null;

  // tags.emotes: { emoteId: ['start-end', ...] } (o string "start-end/start-end"
  // sin parsear). Se recolectan TODAS las apariciones de TODOS los emotes y se
  // reemplaza cada rango por un token `:nombre:` — mismo formato que YouTube/Kick,
  // para que el renderer de chat las pinte como imagen y sanitizeForTTS pueda
  // quitarlas del texto que lee el TTS (antes quedaban como palabra suelta).
  const occurrences = [];
  if (tags.emotes) {
    for (const [emoteId, positions] of Object.entries(tags.emotes)) {
      const ranges = Array.isArray(positions) ? positions : String(positions).split('/');
      for (const range of ranges) {
        const [start, end] = String(range || '').split('-').map(Number);
        if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
        if (start < 0 || end < start || end >= text.length) continue;
        occurrences.push({ start, end, emoteId, name: text.substring(start, end + 1) });
      }
    }
  }
  occurrences.sort((a, b) => a.start - b.start);

  const emotes = {};
  let displayText = '';
  let cursor = 0;
  for (const occ of occurrences) {
    if (occ.start < cursor || !occ.name) continue; // rango solapado/invalido, se ignora
    const safeName = occ.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    displayText += text.slice(cursor, occ.start) + `:${safeName}:`;
    emotes[safeName] = { url: `https://static-cdn.jtvnw.net/emoticons/v2/${occ.emoteId}/default/dark/1.0` };
    cursor = occ.end + 1;
  }
  displayText += text.slice(cursor);

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName(tags['display-name'] || tags.username || 'Anónimo'),
    userId: tags['user-id'] || null,
    // Identidad admin: tags.username (login, unico globalmente en Twitch),
    // NUNCA display-name (cosmetico, el espectador lo setea a lo que quiera
    // y puede copiar el nombre del admin — ver bug de is-admin-identity.js).
    stableHandle: tags.username || null,
    comment: sanitizeForTTS(displayText),
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: undefined,
  };
}

function extractYoutubeMessage(item) {
  const emotes = {};
  const displayParts = [];
  for (const part of (item.message || [])) {
    if (part.text) {
      displayParts.push(part.text);
    } else {
      const rawName = part.emojiText || part.alt || '';
      const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'emoji';
      const url = part.url || '';
      displayParts.push(`:${safeName}:`);
      if (url) emotes[safeName] = { url };
    }
  }
  const displayText = displayParts.join('').trim();
  if (!displayText) return null;

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName((item.author && item.author.name) || 'Anónimo'),
    userId: (item.author && item.author.channelId) || null,
    // Identidad admin: best-effort. `youtube-chat` no expone ningun handle
    // human-readable estable en el mensaje de chat — channelId (userId) es
    // estable pero no coincide con el formato 'br0k3ny' de adminIdentities,
    // y el nombre del canal (unico dato con ese formato) NO esta garantizado
    // unico por YouTube y es tan mutable/spoofeable como el nickname de
    // TikTok. No es un fix completo para esta plataforma, es la mejor
    // proteccion posible con el dato disponible.
    stableHandle: (item.author && item.author.name) || null,
    comment: sanitizeForTTS(displayText),
    // Siempre string (aunque quede vacio si el mensaje es solo emojis/stickers) —
    // nunca undefined, para que el front no caiga de vuelta a `comment` y termine
    // leyendo el token crudo `:nombre:` en voz alta.
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: item.id || undefined,
  };
}

// Kick manda los emotes dentro de `content` como tokens `[emote:ID:nombre]`.
// Se convierten al mismo formato `:nombre:` + mapa de urls que Twitch/YouTube,
// para que el renderer los pinte como imagen y sanitizeForTTS los saque del
// texto que lee el TTS.
const KICK_EMOTE_TOKEN = /\[emote:(\d+):([^\]]*)\]/g;

function extractKickMessage(raw) {
  // raw viene de canales/kick/handle-event.js: { id, userId, username, content }
  const source = String(raw.content || '').trim();
  if (!source) return null;

  const emotes = {};
  const displayText = source.replace(KICK_EMOTE_TOKEN, (_m, id, name) => {
    const safeName = String(name || `emote_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_') || `emote_${id}`;
    emotes[safeName] = { url: `https://files.kick.com/emotes/${id}/fullsize` };
    return `:${safeName}:`;
  }).trim();
  if (!displayText) return null;

  const ttsText = displayText.replace(/:[\w-]+:/g, '').trim();
  return {
    user: cleanName(raw.username || 'Anónimo'),
    // Kick si expone el id numerico estable del usuario — /moderacion lo usa
    // como clave firme (no cae al castigo fragil por-nombre).
    userId: raw.userId || null,
    // Identidad admin: raw.username (login/slug de la cuenta) sin el cleanName
    // de arriba — Kick no separa nickname de username (a diferencia de
    // Twitch/TikTok), asi que ya es el identificador estable de la cuenta.
    stableHandle: raw.username || null,
    comment: sanitizeForTTS(displayText),
    // Siempre string (aunque quede vacio si el mensaje es solo emotes/emoji) —
    // nunca undefined, para que el front no caiga de vuelta a `comment` y
    // termine leyendo el token crudo `:nombre:` o el emoji en voz alta.
    ttsComment: sanitizeForTTS(ttsText),
    emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
    ytMsgId: undefined,
  };
}

/**
 * Orquestador central: llega crudo de /canales, pasa por el veredicto de
 * /moderacion, decide si dispara TTS, publica ya enriquecido. Reemplaza
 * emitChatMessage (backend-viejo/server.js:1489).
 */
function emitChatMessage(deps) {
  return (payload) => {
    const { bus, logger } = deps;
    const { platform, channel, raw } = payload || {};
    if (!raw) return;

    let extracted = null;
    if (platform === 'tiktok') {
      extracted = extractTiktokMessage(raw);
    } else if (platform === 'twitch') {
      extracted = extractTwitchMessage(raw);
    } else if (platform === 'youtube') {
      // Superchat puede venir sin texto (solo monto) — se alerta aparte,
      // independiente de si hay comentario para el chat normal.
      if (raw.superchat) {
        bus.emit('canal:evento-especial', { platform: 'youtube', channel, kind: 'superchat', raw: { ...raw.superchat, author: raw.author } });
      }
      extracted = extractYoutubeMessage(raw);
    } else if (platform === 'kick') {
      extracted = extractKickMessage(raw);
    }
    if (!extracted) return;

    const { user, userId, stableHandle, comment, ttsComment, emotes, ytMsgId } = extracted;

    // Gate de dedup — punto comun de las 4 plataformas. Un mensaje ya emitido
    // dentro de la ventana (replay tras reconexion) se descarta en silencio:
    // no re-registra interaccion, no re-evalua moderacion, no llega al broadcast.
    const dedupKey = buildDedupKey(platform, raw, userId || user, normalizeAggressive(comment));
    if (isDuplicateMessage(dedupKey, Date.now())) {
      logger.log(
        'debug', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.duplicado',
        `Mensaje duplicado descartado de ${user} (${platform})`, { platform, userId, nick: user }
      );
      return;
    }

    // Un solo candidato, el identificador estable por plataforma — nunca el
    // nickname/display-name mutable (ver comentarios en cada extract*Message).
    const isAdmin = isAdminIdentity(bus, platform, stableHandle);

    // Registro de interaccion: /moderacion (Fase 5) escucha este evento con
    // el dato ya limpio en vez de parsear el crudo de /canales.
    bus.emit('chat:mensaje-recibido', { platform, userId, nick: user });

    let evaluated;
    try {
      evaluated = moderacionPolicyContract.evaluate({ platform, userId, nick: user, text: normalizeForModeration(comment) });
    } catch (error) {
      // policy.evaluate() ya tiene su propio fail-open interno — esto es
      // defensa en profundidad por si la inyeccion del contrato fallara.
      logger.log(
        'error', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.policy_fallo_evaluacion',
        `moderacionPolicy.evaluate lanzo una excepcion, se trata el mensaje como permitido: ${error.message}`,
        { platform, userId, nick: user, error: error.message, stack: error.stack }
      );
      evaluated = { isSpam: false, isMuted: false, isBanned: false, isFollower: false };
    }

    const veredicto = isAdmin
      ? { isSpam: evaluated.isSpam, isMuted: false, isBanned: false, isFollower: true }
      : evaluated;

    if (veredicto.isBanned) {
      logger.log(
        'info', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.bloqueado',
        `Mensaje bloqueado de ${user} (${platform}): usuario baneado`, { platform, userId, nick: user, motivo: 'user-banned' }
      );
      bus.emit('chat:mensaje-bloqueado', { platform, userId, nick: user, motivo: 'user-banned' });
      return;
    }
    if (veredicto.isSpam) {
      logger.log(
        'info', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.bloqueado',
        `Mensaje bloqueado de ${user} (${platform}): spam`, { platform, userId, nick: user, motivo: 'spam' }
      );
      bus.emit('chat:mensaje-bloqueado', { platform, userId, nick: user, motivo: 'spam' });
      return;
    }

    let config = null;
    bus.emit('config:get', (c) => { config = c; });
    const isFollower = veredicto.isFollower;
    const nonFollowerBlocked = !(config && config.ttsReadNonFollowers) && !isFollower;
    const ttsBlocked = veredicto.isMuted || nonFollowerBlocked;

    const msgId = `${platform}:${userId || user}:${Date.now()}`;
    const enrichedPayload = {
      type: 'chat',
      platform,
      channel,
      user,
      userId: userId || null,
      comment,
      ttsComment,
      emotes,
      ytMsgId,
      isFollower,
      muted: veredicto.isMuted,
      ttsBlocked,
      isAdmin: !!isAdmin,
      timestamp: Date.now(),
    };

    bus.emit('chat:mensaje-permitido', enrichedPayload);
    bus.emit('ws:broadcast', enrichedPayload);

    // Nunca el texto del mensaje, solo identificadores.
    logger.log(
      'debug', 'chat', 'chat/emit-chat-message.js#emitChatMessage', 'chat.mensaje.emitido',
      `Mensaje emitido de ${user} (${platform})`, { platform, userId, nick: user, msgId }
    );

    if (isAdmin && !adminAnnounced) {
      adminAnnounced = true;
      // `text` = pick del backend segun config.ttsVoiceLang (fallback para
      // clientes viejos). `texts` = mapa completo: el cliente resuelve contra
      // su voz TTS real (voiceSelect.value), que es quien lo habla — asi nunca
      // hay desincronizacion config<->voz visible.
      const text = pickAnnounceText(ADMIN_ANNOUNCE_TEXT, config && config.ttsVoiceLang);
      bus.emit('ws:broadcast', { type: 'admin-announce', text, texts: ADMIN_ANNOUNCE_TEXT, timestamp: Date.now() });
    }
  };
}

module.exports = { emitChatMessage, resetAdminAnnounce, resetDedup };
