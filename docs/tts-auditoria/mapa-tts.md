# Cadena TTS (develop, tras #42 #43 #44 #45)

> <mark>Amarillo</mark> = vigila que el texto no se repita. <ins>**[FIX #NN]**</ins> = arreglado en ese PR.
> Toda la moderación vive ahora en el paquete **@tiklivetts/chat-guard** (repo TikLiveTTS/chat-guard): una sola puerta `guard.review({ platform, raw })` para las 4 plataformas.

## 1. Ingesta (features/canales)

- `tiktok/connect-tiktok-channel.js` — `conn.on('chat')` de @tiklivetts/tiktok-live-client → `canal:mensaje-crudo`
- `twitch/connect-twitch.js` — tmi.js `message` → `canal:mensaje-crudo`
- `youtube/connect-youtube.js` — youtube-chat `chat` → `canal:mensaje-crudo`
- `kick/connect-kick.js` + `kick/handle-event.js` — Pusher → `canal:mensaje-crudo`
- Reconexión
  - <ins>**[FIX #45]**</ins> `reconnect-delay.js#reconnectDelayMs` — backoff único: 1, 2, 4, 8, 16 s y luego cada 30 s
  - <ins>**[FIX #45]**</ins> `scheduleReconnect` (twitch / youtube / kick) — un reintento fallido programa el siguiente; el watchdog también pasa por aquí
  - <ins>**[FIX #45]**</ins> `state.*ReconnectDesired` + `disconnect*` — quitar el canal cancela reintentos; un reintento tardío no lo revive

## 2. Bus y contrato

- `core/event-bus.js` — `canal:mensaje-crudo` → dominio chat
- `core/contracts/moderacion-policy.js#review` — contrato síncrono inyectado por moderación

## 3. Chat (features/chat/emit-chat-message.js)

- `emitSpecialEvent` — superchat de YouTube → `canal:evento-especial`
- `reviewMessage` — llama al contrato `review`
- <ins>**[FIX #42]**</ins> `fallbackVerdict` — si la moderación falla: se **muestra pero no se lee** (antes se leía sin moderar)
- `buildPayload` — mismo payload de siempre + `moderationKey`
- `broadcastMessage` — `chat:mensaje-permitido` + `ws:broadcast`
- `reportBlocked` — `chat:mensaje-bloqueado` con motivo
- <ins>**[FIX #42]**</ins> Todo `drop` del guard se respeta, también el del admin (antes el admin reenviado se volvía a leer)
- `announceAdminOnce`, `core/display-name/` (`resolveDisplayName`, `resolveSpokenName`, `cleanName`) — nombre visible y aviso de admin

## 4. Moderación (features/moderacion)

- `index.js` — dueño del guard (holder por cuenta), implementa `review` y añade `moderationKey` + seguidor
- <ins>**[FIX #42]**</ins> `build-guard-options.js` — reglas desde la config; `languageCheck` lee la voz/idioma en cada mensaje (en caliente)
- <ins>**[FIX #44]**</ins> tope de voz por defecto = `GOOGLE_TTS_MAX_CHARS` (200)
- Persistencia (`persistence/`)
  - `load-registry.js` — migra `moderation.json` v1 → v2 y deja `moderation.v1.json`; JSON corrupto → `.corrupt-<ts>`
  - <ins>**[FIX #42]**</ins> `create-registry-store.js` — ban/mute/whitelist se guardan al instante; `touch` con debounce
  - `schedule-flush.js`, `flush-registry.js`, `to-dto.js`, `list-viewers.js`, `viewer-stats.js`
- Rutas HTTP + tools MCP `moderation_*` — mismo contrato que antes (UI sin cambios)

## 5. Paquete @tiklivetts/chat-guard (orden de review)

- Adaptadores (`src/adapters/`) — el único lugar que conoce los formatos de cada plataforma
  - `tiktok.js`, `twitch.js`, `youtube.js`, `kick.js`, `emote-token.js`, `raw-value.js`
- Texto (`src/text/`)
  - `fold.js` — un solo normalizador (minúsculas, acentos, leet)
  - <mark>`collapse-repeated-chars.js` — "holaaaaaa" → "holaaa"</mark>
  - <mark><ins>**[FIX #42]**</ins> `collapse-repeated-words.js` — "hola hola hola hola" → "hola hola" (la causa de los reportes)</mark>
  - `to-display-text.js`, `to-speech-text.js`
- Reglas (`src/rules/`, en este orden)
  - <mark>1. `duplicate-redelivery.js` — mismo id de origen = reenvío tras reconexión → descartado (ventana 6 h)</mark>
  - 2. `registry.touch` — registra actividad y nombre
  - 3. `identity.js` — banned (drop) · muted / non-follower (mute) · el admin salta solo estas tres
  - 4. `too-long.js`, `repeated-char.js`, `blocked-word.js`, `language.js`
  - <mark>5. `flood.js` — mismo autor + mismo texto en 45 s → descartado ("ok"/"no"/"ja" exentos)</mark>
  - `time-window.js` — ventana de tiempo compartida por reenvío y flood
- Registro (`src/registry/`) — `create-viewer-registry.js`, `viewer-key.js`; migración en `src/migrate/`

## 6. Transporte y cola (interfaz)

- `core/broadcast.js` → `interfaz/src/nucleo/ws/cliente-ws.js` → `vistas/principal/chat-ui.js#handleChatData`
- `nucleo/tts/cola-tts.js#speak` — cola ordenada por timestamp, un solo narrador
- `nucleo/tts/cola-tts.js#processQueue` — serializa la cola (`queuePumping`)

## 7. Audio

- `features/sonido/tts/routes/generate.js` → `features/sonido/sanitize-for-tts.js` → `features/sonido/tts/fetch-audio.js` (caché, reintentos, backoff)
- <ins>**[FIX #43]**</ins> `TTS_MAX_CHARS` acotado a 200 (default, validador, slider y configs viejas), el tope real de Google
- `cola-tts.js#playAudioBlob` — reproduce
- <mark><ins>**[FIX #43]**</ins> `stop-audio.js#stopAudio` — si `play()` tarda o falla, el audio se corta antes de avanzar: ya no suenan dos voces a la vez</mark>
