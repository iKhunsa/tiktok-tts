# Bug 05 — Watchdog de YouTube demasiado agresivo + `youtubeSeenIds` sin ventana temporal

## Contexto

`features/canales/youtube/chat-watchdog.js`: `WATCHDOG_TIMEOUT_MS = 4 * 60 * 1000`.
Si el chat de YouTube no dice nada en 4 min, fuerza `forceReconnect`. Evidencia
(log `soy.italiano`): **~74 `canales.youtube.chat_estancado` en 28 h**, en reloj
estricto de 4 min, 5 intentos con backoff, ~30 min de calma, y vuelve a empezar.
Cada una de esas reconexiones re-emite el backlog (parte del ciclo de replay).

Segundo problema en el mismo conector: `state.youtubeSeenIds` (dedup) tiene
`SEEN_IDS_CAP = 500` sin ventana de tiempo (`connect-youtube.js:48,84-91`).
En un stream con chat movido, un mensaje re-enviado tras >500 mensajes nuevos
(≈20 min) ya fue evictado del Set → se re-broadcastea → se re-lee. El comentario
del código dice que el Set existe "para evitar replays en reconexión", pero el
cap lo hace inefectivo justo en los streams donde más importa.

## Problema

1. 4 min de silencio de chat es normal en un stream de YouTube tranquilo. El watchdog lo trata como conexión muerta y reconecta, generando churn + replay.
2. El dedup de YouTube se evacua por tamaño antes de que deje de ser útil.

## Pasos para reproducir

1. Conectar YouTube a un stream en vivo con chat lento (< 1 msg / 4 min).
2. Observar `canales.youtube.chat_estancado` cada 4 min exactos aunque la conexión esté sana.
3. Cada reconexión → burst de `chat.mensaje.emitido` con IDs repetidos.

Para el cap: en un stream con >500 msg en 20 min, forzar reconexión y ver que
mensajes de hace 20 min se re-emiten (ya no están en `youtubeSeenIds`).

## Comportamiento esperado

1. Subir `WATCHDOG_TIMEOUT_MS` a un valor que tolere chat lento sin perder la
   capacidad de detectar una conexión muerta. Sugerido: **8–10 min** (alinear
   con Kick = 5 min como piso, pero YouTube tolera más silencio legítimo).
   Confirmar que YouTube sí tiene el modo de fallo "200 OK con `actions:[]`, sin
   error" (comentado en `connect-youtube.js:67-70`) y que subir el timeout no
   deja ese caso sin cubrir demasiado tiempo.
2. `youtubeSeenIds`: agregar ventana temporal. En vez de `Set<id>` con cap,
   usar `Map<id, timestamp>` y evictar por edad (p.ej. > 15 min) además del cap
   de seguridad. O reutilizar el mismo mecanismo que se defina en la tarea 01
   (si la 01 pone un gate central con ventana, el `youtubeSeenIds` local podría
   incluso quedar redundante — evaluarlo).

## Alcance / archivos involucrados

- `features/canales/youtube/chat-watchdog.js` — el timeout.
- `features/canales/youtube/connect-youtube.js` — el dedup (`youtubeSeenIds`, ~L48-92).
- `features/canales/state/channel-maps.js` — si `youtubeSeenIds` cambia de `Set` a `Map`.
- `test/` — test del dedup con ventana (un ID visto hace 20 min ya no bloquea; uno de hace 1 min sí).

## Criterios de aceptación

- [ ] `WATCHDOG_TIMEOUT_MS` de YouTube ≥ 8 min, con comentario justificando el número.
- [ ] Un stream con chat cada ~5 min NO dispara `chat_estancado`.
- [ ] Una conexión realmente muerta se sigue detectando (dentro del nuevo timeout).
- [ ] `youtubeSeenIds` evacua por edad, no solo por cap de 500.
- [ ] Un mensaje re-emitido 20 min después en un stream movido se sigue descartando.
- [ ] `npm test` pasa.

## Notas / restricciones

- Depende de la tarea 01: si el gate central de dedup (01) ya cubre YouTube con ventana temporal, esta tarea se reduce a solo subir el timeout del watchdog, y el `youtubeSeenIds` local puede simplificarse o quedar como defensa redundante barata. El subagente decide según cómo quedó 01.
- **No** eliminar el watchdog de YouTube. Solo calibrarlo. El modo de fallo "200 sin actions" es real y el watchdog es la única red para eso.
- No tocar Kick en esta tarea (es la 06).
- Familia con la tarea 06 (calibrar watchdogs) pero archivos distintos, sin dependencia dura.
