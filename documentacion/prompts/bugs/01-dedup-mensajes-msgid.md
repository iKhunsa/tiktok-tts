# Bug 01 — Dedup de mensajes por msgId estable en el broadcast

## Contexto

Los usuarios reportan que el TTS "repite todo lo que se dijo antes" tras una
reconexión o un hueco de inactividad. Diagnóstico (3 subagentes, evidencia en
logs de producción v1.8.7):

- Cuando un conector de plataforma reconecta, la librería entrega su buffer de
  mensajes recientes como `'chat'` nuevos (probado: hasta **66 `chat.mensaje.emitido`
  con `msgId` byte-idéntico en 1 segundo**, siempre coincidiendo con un
  `canales.*.conectado` / `reconexion_exitosa`).
- **No hay deduplicación por msgId en NINGÚN punto** entre "llega el mensaje" y
  "entra a la cola de TTS":
  - `features/chat/emit-chat-message.js:239` ya calcula `const msgId = \`${platform}:${userId || user}:${Date.now()}\`` pero **solo para el log** (`:263`), nunca lo compara ni lo mete en el payload del broadcast (`enrichedPayload`, `:240-255`).
  - `interfaz/src/nucleo/tts/cola-tts.js#speak` hace `speechQueue.push()` incondicional. El `msgId` que ve el cliente es un contador local `msg-N` (`cliente-ws.js:40-44`), no identidad estable.
- YouTube y Kick sí dedupean, pero **en el conector** (`youtubeSeenIds` / `kickSeenIds`), y YouTube con cap 500 sin ventana temporal → en chat movido el ID viejo se evicta y el replay pasa igual. TikTok y Twitch: cero dedup.

Regla de modularidad del repo: `features/chat/emit-chat-message.js` es el
**único** punto por el que salen los mensajes de las 4 plataformas. El dedup va
ahí, una sola vez, no repetido en cada conector.

## Problema

`emitChatMessage` re-emite mensajes ya emitidos (mismo `platform`, `userId`,
texto) cuando el conector los reentrega tras una reconexión. El frontend los
encola y sintetiza. El usuario escucha el chat de los últimos minutos repetido.

Ojo con el `Date.now()` en el msgId: en el replay de TikTok, **el backlog se
re-estampa con la hora del reconnect** — dos usuarios distintos salen con el
mismo sufijo `...18925`. El msgId actual NO es estable entre la emisión
original y el replay. Hace falta una clave de identidad real
(`platform:userId:texto-normalizado` o un id de la plataforma cuando exista).

## Pasos para reproducir

1. Conectar un canal de TikTok con chat activo.
2. Forzar una reconexión (matar el WS, o esperar el reconnect por timer / dar "conectar todo").
3. Observar `chat.mensaje.emitido` en los logs justo después de `reconexion_exitosa`: aparece un burst de mensajes ya emitidos antes de la caída.
4. Con TTS activo: se escucha el chat reciente repetido.

Test rápido sin stream: emitir el mismo `canal:mensaje-crudo` dos veces por el
bus y verificar que el segundo NO produce `chat:mensaje-permitido`.

## Comportamiento esperado

Un mensaje ya procesado por `emitChatMessage` dentro de una ventana razonable
(sugerido: **10 min o 2000 mensajes, lo que llegue primero**) se descarta
silenciosamente (log `debug`, no `warn`): no se emite `chat:mensaje-permitido`,
no llega al broadcast, no se encola en TTS.

La clave de dedup debe ser estable entre la emisión original y el replay. Como
el timestamp no sirve, usar `platform + userId + normalizeAggressive(texto)`
(ya existe `normalize-aggressive.js` en el repo) o el id nativo de la
plataforma si el `raw` lo trae (YouTube: `item.id`; Kick: `raw.id`; TikTok:
revisar si `raw` trae algún id de mensaje estable, probablemente no).

## Alcance / archivos involucrados

- `features/chat/emit-chat-message.js` — el gate de dedup va acá, en `emitChatMessage`, antes de `moderacionPolicy.evaluate()` o justo después (decidir: ¿un mensaje bloqueado por spam cuenta como "visto"? probablemente sí, para no re-evaluarlo).
- `features/chat/index.js` — si hace falta pasar estado (el Set) por `deps`.
- Posible `core/<nombre>.js` nuevo SOLO si el Set necesita compartirse con otro dominio (no debería — es interno a `chat/`).
- `test/` — un test nuevo del gate.
- Revisar si conviene además meter el `msgId` estable en `enrichedPayload` para que el frontend pueda hacer su propio dedup defensivo (opcional, la tarea 01 no lo exige).

## Criterios de aceptación

- [ ] Emitir el mismo `canal:mensaje-crudo` dos veces (simulando replay) produce `chat:mensaje-permitido` **una sola vez**.
- [ ] El segundo intento loguea a nivel `debug` con un evento tipo `chat.mensaje.duplicado` (no `warn`, no GlitchTip).
- [ ] La ventana está acotada por tiempo Y tamaño (no crece sin límite en un stream de 8 h).
- [ ] Un mensaje legítimamente repetido por un usuario 20 min después NO se descarta (fuera de ventana).
- [ ] Cubre las 4 plataformas (el gate está en el punto común, no por conector).
- [ ] `npm test` pasa. Hay un test nuevo que fija el comportamiento del gate.
- [ ] La clave de dedup NO depende de `Date.now()` ni del `msgId` actual de `:239`.

## Notas / restricciones

- **No** tocar los `youtubeSeenIds` / `kickSeenIds` de los conectores en esta tarea (son defensa en profundidad; se calibran en la tarea 05). Esta tarea agrega el gate central; los de conector quedan como están.
- **No** confiar en el `msgId` de `emit-chat-message.js:239` como clave — se re-estampa en el replay.
- El gate corre en el hot path de cada mensaje de chat. Que sea O(1) (Set.has), no un scan.
- Dependencia inversa: la tarea 04 (promo) y la 02 (watchdog) reducen la frecuencia de reconexiones, pero **esta tarea es la que mata el síntoma audible** aunque las reconexiones sigan pasando. Es la de mayor prioridad de la Etapa 1.
- Marcar la ventana elegida con un comentario `ponytail:` si es una heurística (`// ponytail: ventana 10min/2000, subir si hay reportes de replay que se cuela`).
