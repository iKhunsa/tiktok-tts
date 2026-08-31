# Fase 6 — /canales

## Objetivo
Único productor de eventos crudos de plataforma (TikTok, Twitch, YouTube) y de la conexión OBS. No conoce Chat/Overlay/Moderación — solo publica al bus. Es el dominio más grande del rebuild en cantidad de archivos; conviene bloquear un turno completo solo para esta fase.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/canales` — lista completa de subcarpetas y el contrato: *"Canales es el ÚNICO productor de eventos crudos de plataforma. No conoce Chat, Overlay ni Moderación — solo publica al bus."* Eventos que debe emitir: `canal:mensaje-crudo`, `canal:gift`, `canal:follow`, `canal:like`, `canal:estado`.
- `logging-errores-propuesta.md`, sección `/canales` — TODOS los eventos `canales.tiktok.*`, `canales.twitch.*`, `canales.youtube.*`, `canales.rate_limit.*`, `canales.obs.*`, `canales.twitch_oauth.*`, `canales.twitch_eventsub.*`. Esta sección fixea la mayoría de los casos de "falta channel en el log" encontrados en la auditoría — es la fase donde más se nota la diferencia con el backend viejo.
- `mapa-funciones-actual.md`, sección Canales — inventario completo: ~45 funciones/endpoints repartidos en TikTok, Twitch, YouTube, OBS, OAuth device-flow, EventSub.

## Alcance — archivos a crear

```
canales/
  state/
    channel-maps.js
  tiktok/
    connect-tiktok-channel.js
    reconnect-tiktok.js
    cleanup-after-last-channel.js
    clean-username.js
  twitch/
    connect-twitch.js
    fetch-twitch-profile.js
    clean-channel.js
    oauth/
      start.js
      poll-device-token.js
      refresh-token.js
      ensure-access-token.js
      cancel-poll.js
      status.js
      disconnect.js
    eventsub/
      connect-socket.js
      create-follow-subscription.js
      start.js
      stop.js
      schedule-reconnect.js
  youtube/
    connect-youtube.js
    parse-target.js
    stop-chat.js
  obs/
    connect.js
    disconnect.js
    schedule-reconnect.js
    save-replay.js
  rate-limit.js
  routes/
    connect.js
    disconnect.js
    platforms-status.js
    platforms-connect.js
    platforms-disconnect.js
    list-channels.js
    add-channel.js
    remove-channel.js
    obs-connect.js
    obs-disconnect.js
    obs-save-replay.js
    platform-config.js
    oauth-start.js
    oauth-status.js
    oauth-disconnect.js
  broadcast-channels.js
  index.js
```

## Detalle por subcarpeta

### state/channel-maps.js
Migración de `tiktokChannels`/`twitchChannels`/`youtubeChannels` (server.js:280, 2574-2575) — Maps de estado por canal conectado, único estado mutable de este dominio.

### tiktok/*.js
- `connect-tiktok-channel.js` — migración de `connectTiktokChannel` (server.js:3024), timeout anti-cuelgue de 30s preservado. Eventos: `canales.tiktok.conectando`/`conectado`/`conexion_fallida` (con `channel` SIEMPRE, fixea server.js:1756 que hoy no lo incluye)/`timeout_conexion`.
- `reconnect-tiktok.js` — migración de `reconnectTiktok` (server.js:1686) + el handler `conn.on('disconnected')` (server.js:1659). Backoff exponencial idéntico. Eventos: `canales.tiktok.reconectando` (con `{channel, intento, delayMs}` en `data`, fixea server.js:1666 que hoy interpola todo en el string), `reconexion_exitosa`, `reconexion_fallida` (fixea server.js:1701, hoy sin `channel`, Y fixea la asimetría encontrada: hoy el evento de telemetría `platform:reconnect-failed` solo se emite desde el primer `disconnected`, no desde un reintento fallido dentro de esta misma función — en la reconstrucción AMBOS casos emiten el mismo evento).
- `cleanup-after-last-channel.js` — migración de `cleanupAfterLastTikTokChannel` (server.js:1079).
- `clean-username.js` — migración de `cleanTiktokUsername` (server.js:1114).

### twitch/*.js
- `connect-twitch.js` — migración de `connectTwitch` (server.js:2593) + `client.on('disconnected')` (server.js:2715). Eventos: `canales.twitch.conectando`/`conectado`/`reconectando` (fixea server.js:2721, hoy sin `channel`)/`reconexion_fallida`.
- `fetch-twitch-profile.js` — migración de `fetchTwitchProfile` (server.js:2755). Fixea el catch silencioso más citado del análisis (server.js:2792): hoy si la API de Twitch falla, el fallback es silencioso y es imposible diagnosticar por qué un canal nunca muestra avatar/seguidores. Nuevo: `canales.twitch.perfil_obtenido` (debug)/`perfil_fallido` (warn) con `{login, statusHttp, error}`.
- `clean-channel.js` — migración de `cleanTwitchChannel` (server.js:1118).

### twitch/oauth/*.js (Device Code Flow)
Migración completa del flujo actual (server.js:3346-3694): `oauthStatusPayload`, `broadcastOauthStatus`, `cancelTwitchDevicePoll`, `GET /api/auth/twitch/start`, `scheduleTwitchDevicePoll`, `pollTwitchDeviceToken`, `refreshTwitchToken`, `ensureTwitchAccessToken`, `GET /api/oauth/status`, `POST /api/auth/twitch/disconnect`, `saveAuthTokens`/`loadAuthTokens`.

Fixea el catch más citado de esta subcarpeta: `poll-device-token.js` hoy es 100% silencioso ante errores de red contra la API de Twitch (server.js:3432) — nuevo evento `canales.twitch_oauth.poll_error` (warn) con `{error, statusHttp}`. También `canales.twitch_oauth.device_code_emitido` debe loguear el `userCode` **enmascarado**, nunca en texto plano (dato sensible de sesión OAuth).

### twitch/eventsub/*.js (follows)
Migración de server.js:3505-3694 (`clearTwitchEsTimers`, `stopTwitchEventSub`, `scheduleTwitchEsReconnect`, `createTwitchFollowSubscription`, `connectTwitchEventSubSocket`, `startTwitchEventSub`). Fixea: mensaje EventSub no parseable (server.js:3586, hoy silencioso) → `canales.twitch_eventsub.mensaje_no_parseable` (debug); keepalive perdido sin datos (server.js:3577) → `canales.twitch_eventsub.keepalive_perdido` con `{ultimoKeepaliveMs}`.

### youtube/*.js
- `connect-youtube.js` — migración de `connectYoutube` (server.js:2797) + `liveChat.on('error')` (server.js:2878). Fixea server.js:2879 (`YouTube chat error` hoy sin `channel`, y `String(err)` puede perder el stack — nueva versión pasa el `Error` real a `core/logger.js` para extracción automática) y server.js:2890 (`Reconectando...` sin `channel`).
- `parse-target.js` — migración de `parseYoutubeTarget`/`normalizeYoutubeInput` (server.js:1127/1174).
- `stop-chat.js` — migración de `stopYoutubeChat` (server.js:2587).

### obs/*.js
- `connect.js` — migración de `connectObs` (server.js:3175). Fixea `canales.obs.conectado` sin payload hoy (telemetryBus 'obs:connected') → ahora `{host, port}`. Fixea el parse error de mensajes OBS que hoy es `console.warn` suelto (server.js:3229) → `canales.obs.mensaje_no_parseable` (debug) con `{rawPreview}`.
- `disconnect.js`, `schedule-reconnect.js` — migración de la lógica de reconexión OBS (server.js:3250-3267).
- `save-replay.js` — migración de `POST /api/obs/save-replay` (server.js:3306), consumido después por `/clips` en la Fase 11 vía `bus.emit('canal:obs:guardar-replay')`. Fixea `canales.obs.replay_guardado` sin payload y `replay_fallido` que hoy solo responde HTTP sin loguear server-side (server.js:3317).

### rate-limit.js
Migración de `connectRateLimiter`/`isConnectRateLimited` (server.js:1439/1425). Evento `canales.rate_limit.bloqueado` (warn) `{ip, endpoint}` — hoy el 429 no loguea ni IP ni endpoint.

### routes/*.js
Migración 1:1 de los endpoints HTTP: `POST /api/connect` (server.js:1747), `POST /api/disconnect` (:1768), `GET /api/platforms/status` (:2919), `POST /api/platforms/connect` (:2928), `POST /api/platforms/disconnect` (:2955, fixear — hoy responde HTTP sin log server-side), `GET /api/channels` (:3016), `POST /api/channels/add` (:3100), `POST /api/channels/remove` (:3124, mismo fix), `POST/DELETE /api/obs/connect`/`/api/obs/disconnect` (:3275/3295), `GET/PATCH /api/platform-config` (:3322/3326), rutas OAuth.

### broadcast-channels.js
Migración de `broadcastChannels` (server.js:1535) — ahora publica `bus.emit('canal:estado', {...})` en vez de llamar `broadcast()` directo (el core traduce a WS en `core/broadcast.js` de la Fase 1).

### index.js
`register({app, bus})`: monta las ~19 rutas + arranca los listeners de conexión de las 3 plataformas. Traduce eventos internos de conexión a eventos de bus: `bus.emit('canal:mensaje-crudo', {platform, raw})`, `bus.emit('canal:gift', ...)`, `bus.emit('canal:follow', ...)`, `bus.emit('canal:like', ...)`, `bus.emit('canal:estado', ...)`. `shutdown()`: cierre ordenado de todos los canales/OBS (migración de `module.exports.shutdown`, server.js:4081).

## Criterios de aceptación
1. Conectar un canal TikTok/Twitch/YouTube de prueba real — confirmar con un listener de debug temporal en `/core` que `canal:mensaje-crudo`/`canal:gift`/`canal:follow`/`canal:like` se emiten con el payload esperado por cada evento real de la plataforma.
2. Desconexión forzada de un canal (cerrar la conexión desde afuera) — el backoff de reconexión debe seguir los mismos intervalos/máximo de intentos que el backend viejo, y cada intento debe loguear `channel` correctamente.
3. Flujo OAuth de Twitch completo (device code → autorización en navegador → token guardado) funcionando igual que hoy.
4. EventSub de follows de Twitch recibiendo notificaciones reales en un canal de prueba.
5. `POST /api/obs/save-replay` con OBS conectado y desconectado — ambos casos loguean correctamente (hoy el caso desconectado no loguea nada server-side).
6. Grep del log de una sesión de prueba con reconexiones forzadas: cero apariciones de un evento de canal sin su `channel`/`login`/`channelOrId` correspondiente en `data`.

## Riesgos
- Es la fase de mayor superficie (3 protocolos externos distintos: WebSocket scraping de TikTok, IRC de Twitch vía tmi.js, scraping de YouTube). Cualquier cambio de comportamiento de las librerías externas (`tiktok-live-connector`, `tmi.js`, `youtube-chat`) entre la versión usada por el backend viejo y la que se instale para el nuevo puede introducir diferencias no relacionadas con la reconstrucción — fijar las mismas versiones de dependencias que en `backend-viejo/package.json` (via el `package.json` real, revisar en ejecución) antes de empezar esta fase.
- El flujo OAuth de Twitch involucra credenciales reales (client_id/secret) — probar contra una cuenta de test de Twitch, no contra la cuenta de producción del usuario, para no invalidar tokens en uso.
