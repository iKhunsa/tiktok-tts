# Bug 02 — Watchdog de socket mudo para TikTok y Twitch

## Contexto

Segundo síntoma que reportan los usuarios: "de repente deja de leer los
mensajes nuevos, se arregla con 'conectar todo'". Diagnóstico:

- El heartbeat de `tiktok-live-connector` es fire-and-forget: `autoPong:false`,
  `setInterval(sendHeartbeat, 10000)` (`node_modules/tiktok-live-connector/dist/lib/ws/lib/ws-client.js:25,127`)
  pero **nunca chequea que llegue respuesta**, sin `isAlive`, sin `terminate()`.
- Si el TCP queda half-open (NAT timeout, suspensión del equipo, blip de red),
  `ws` no emite `'close'` ni `'error'`. El conector no emite `'disconnected'`.
  La app deja el canal en `state.tiktokChannels`, el panel muestra "en vivo", y
  **no llega ningún mensaje más** hasta el reconnect por timer (~1 h) o hasta
  que el usuario da "conectar todo".
- Evidencia (log `bubulubuvt`): huecos de **11, 22 y 42 min** en
  `chat.mensaje.emitido` con TikTok `conectado` y sin reconnect logueado.
- Kick y YouTube ya resuelven esto: `features/canales/kick/stale-watchdog.js`
  (5 min, re-armado por mensaje → `scheduleReconnect(..., 'stale')`) y
  `features/canales/youtube/chat-watchdog.js` (4 min → `forceReconnect`).
  **TikTok y Twitch no tienen nada.**

Regla de modularidad: dos+ consumidores que cruzan un límite de dominio → helper
compartido. Acá son 2 conectores dentro del mismo dominio `canales/` → helper en
`features/canales/`.

## Problema

TikTok y Twitch no detectan un socket que quedó mudo. La app reporta "en vivo"
contra una conexión muerta hasta que algo externo (timer o usuario) fuerza la
reconexión.

## Pasos para reproducir

1. Conectar TikTok. Dejar el stream con chat.
2. Simular half-open: suspender el equipo 2 min, o cortar la red del proceso sin cerrar el socket (más fácil en test: no llamar a nada, dejar el `conn` sin emitir eventos).
3. Reanudar. Observar que `chat.mensaje.emitido` no vuelve, panel sigue "en vivo", ningún log de reconexión.
4. Con el fix: a los N minutos sin `'chat'`, log `canales.tiktok.sin_eventos` + reconexión forzada.

## Comportamiento esperado

Un helper `features/canales/stale-watchdog.js` (o el nombre que encaje) genérico:
`armWatchdog(state, key, timeoutMs, onStale)` / `clearWatchdog(state, key)`,
guardando timers en un Map en `state` (patrón de `kick/stale-watchdog.js`).

- **TikTok** (`connect-tiktok-channel.js`): armar el watchdog al conectar y
  re-armarlo en cada `conn.on('chat')`. `onStale` → mismo path que la
  reconexión existente (`reconnectTiktok` o `scheduleReconnect` equivalente),
  con `motivo: 'stale'` y reset de `attempts`.
- **Twitch** (`connect-twitch.js`): igual, sobre el `client.on('message')` de tmi.js.
- Timeout sugerido: **5 min** (igual que Kick). Un chat que no dice nada en 5
  min y encima no es Twitch/YouTube (que tienen su propio motivo) es raro, y el
  costo de una reconexión espuria es bajo. NO usar 4 min (ver tarea 05, es
  demasiado agresivo para YouTube; no repetir el error).
- Limpiar el watchdog en disconnect explícito, en `streamEnd`, y en el teardown
  por reintentos agotados.

Idealmente el helper lo usan también Kick y YouTube (unificar los 3-4 en uno),
pero eso es refactor opcional: **el mínimo de esta tarea es TikTok + Twitch**.
Si unificar los 4 sale barato y sin riesgo, hacerlo; si no, dejar Kick/YouTube
como están y solo compartir el helper nuevo entre TikTok y Twitch.

## Alcance / archivos involucrados

- `features/canales/stale-watchdog.js` — helper nuevo (o generalizar `kick/stale-watchdog.js` y moverlo).
- `features/canales/tiktok/connect-tiktok-channel.js` — armar/re-armar/limpiar.
- `features/canales/tiktok/reconnect-tiktok.js` — limpiar/re-armar en la reconexión.
- `features/canales/twitch/connect-twitch.js` — armar/re-armar/limpiar.
- `features/canales/state/channel-maps.js` — Map de timers nuevo (`tiktokWatchdogTimers`, `twitchWatchdogTimers`, o uno genérico).
- `test/` — test del helper (arma, re-arma, dispara `onStale` solo tras el timeout sin actividad, no deja timers colgados → usar `unref()` como en `telemetria/connectors/platforms.js`).

## Criterios de aceptación

- [ ] Sin `'chat'` durante `timeoutMs`, TikTok dispara `onStale` → reconexión con `motivo:'stale'`.
- [ ] Cada `'chat'` re-arma el watchdog (no dispara si el chat está activo).
- [ ] Lo mismo para Twitch.
- [ ] El watchdog se limpia en disconnect explícito, `streamEnd` y teardown — no quedan `setTimeout` colgados (el proceso puede salir limpio; test lo verifica o usa `unref()`).
- [ ] `npm test` pasa, con test nuevo del helper.
- [ ] La reconexión forzada por stale NO duplica la conexión (chequear que el entry viejo se descartó antes de rearmar).

## Notas / restricciones

- **Hacer la tarea 03 ANTES que esta** — ambas tocan `connect-tiktok-channel.js` y 03 es más chica y aislada. Rebasar 02 sobre 03.
- **No** bajar el timeout de 5 min "por las dudas". Ver tarea 05: 4 min ya demostró ser demasiado agresivo en YouTube (74 reconexiones espurias en 28 h).
- La reconexión forzada por stale hereda el bug de replay (tarea 01). Por eso 01 va primero en el roadmap: sin 01, este watchdog *causa* replay cada vez que dispara. Con 01, el replay se descarta.
- No tocar el heartbeat interno de `tiktok-live-connector` (es `node_modules`). El watchdog vive del lado de la app, sobre el evento `'chat'`.
