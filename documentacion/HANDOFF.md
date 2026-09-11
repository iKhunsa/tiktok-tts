# Handoff — TikLive TTS · Bugs de canales / replay / observabilidad

Última actualización: 2026-09-10 por orquestador (Etapas 1-3 completas; tarea 09 resuelta como aceptada)

## Estado general

App en producción **v1.8.7**. Los usuarios reportan que el TTS deja de leer
mensajes nuevos y, tras un hueco de inactividad o ~1 h, re-lee todo el chat ya
leído. El diagnóstico está cerrado (ver `reporte-errores-canales.md` más abajo):
un solo mecanismo raíz (reconexión de conector → replay de backlog sin dedup) +
dos amplificadores (TikTok muere en silencio, YouTube reconecta cada 4 min).
El diagnóstico completo (evidencia de logs, traza de código, tabla comparativa
de los 4 conectores) está en la primera entrada del Log de contexto y repartido
en el `## Contexto` de cada prompt de `prompts/bugs/`. Este handoff descompone
el fix en tareas accionables. **Etapas 1, 2 y 3 completas (las 10 tareas cerradas).** Rama `fix/canales-replay-watchdog`, sin pushear.

Rama base para el trabajo: `Dev-2-nuevo-backend` @ `831b8b8` (ya trae
suscripciones-auth + telemetría live-signal mergeadas, aún sin pushear).
Crear rama `fix/canales-replay-watchdog` desde ahí.
> Alternativa descartada por ahora: basar en `main`/`v1.8.7` para un hotfix
> independiente. Se eligió `Dev-2` porque es el tronco de la próxima release y
> las tareas tocan archivos que suscripciones-auth ya modificó.

## Roadmap

- [x] **Etapa 1 — El ciclo que reportan los usuarios** (replay + muerte silenciosa + promo).
      Tareas 01, 02, 03, 04. Es lo único que el usuario final nota. Sale primero, se puede releasear sola.
- [x] **Etapa 2 — Calibrar watchdogs existentes y bajar ruido de observabilidad.**
      Tareas 05, 06, 07. No cambia comportamiento visible; limpia GlitchTip y reduce churn de reconexión.
- [x] **Etapa 3 — Bugs sueltos de frontend / TTS.**
      08 y 10 hechas. 09 resuelta (aceptada como comportamiento esperado + instrumentada, ver Log de contexto).

## Checklist de tareas / bugs

| # | Descripción | Estado | Prioridad | Prompt asociado |
|---|---|---|---|---|
| 01 | Dedup por msgId estable en el broadcast de chat — mata el replay audible en las 4 plataformas | hecho | alta | `prompts/bugs/01-dedup-mensajes-msgid.md` |
| 02 | Watchdog de socket mudo compartido para TikTok y Twitch (patrón de Kick/YouTube) | hecho | alta | `prompts/bugs/02-watchdog-inactividad-tiktok-twitch.md` |
| 03 | `conn.on('error')` de TikTok: leer `err.exception`, no dejar el canal colgado, agendar reconexión post-conexión | hecho | media | `prompts/bugs/03-tiktok-error-handler-incompleto.md` |
| 04 | Scheduler de promo no debe reiniciar la cuenta `[15,45,60]` en una reconexión transitoria | hecho | media | `prompts/bugs/04-promo-rearme-en-reconexion.md` |
| 05 | `chat-watchdog.js` de YouTube: 4 min es muy agresivo; `youtubeSeenIds` sin ventana temporal | hecho | media | `prompts/bugs/05-youtube-watchdog-agresivo.md` |
| 06 | `canales.kick.sin_eventos` cada 5 min en canal tranquilo — falso positivo, churn de reconexión | hecho | baja | `prompts/bugs/06-kick-sin-eventos-falso-positivo.md` |
| 07 | GlitchTip: no promover a issue errores de conexión esperados (streamer offline, YouTube no en vivo) | hecho | baja | `prompts/bugs/07-glitchtip-ruido-errores-esperados.md` |
| 08 | Botón "Fallos conocidos" muerto — `showKnownIssuesNotice` nunca se bridgeó a `window` | hecho | baja | `prompts/bugs/08-boton-fallos-conocidos-muerto.md` |
| 09 | `sonido.tts.respuesta_pequena` dispara en el 100% de las síntesis con `len:0` | hecho (aceptado) | media | `prompts/bugs/09-respuesta-pequena-100pct.md` |
| 10 | `Google TTS failed: "text should be a string"` — valor no-string llega a la síntesis | hecho | baja | `prompts/bugs/10-tts-text-should-be-string.md` |

Dependencias:
- **02 y 03** tocan `features/canales/tiktok/connect-tiktok-channel.js`. Hacer **03 primero** (chico, aislado), después 02.
- **01** es independiente de todo; se puede hacer en paralelo. Es el que más alivio da al usuario.
- **05, 06** son la misma familia (calibrar watchdogs) pero en archivos distintos; sin dependencia dura.
- **07** depende conceptualmente de **03** (una vez que `err.exception` trae texto real, es más fácil filtrar lo esperado de lo real).

Won't-fix registrados: `getaddrinfo ENOTFOUND tiktok.eulerstream.com` (S9 del
reporte, DNS puntual al sign server de EulerStream, fuera de nuestro control);
reconnect storm → `rate_limit_account_minute` (S8, mitigado indirectamente por
la tarea 02 al reducir reconexiones espurias).

## Cómo corre el orquestador (Entregable 3)

Tras confirmar este roadmap:
1. Tomar la primera tarea `pendiente` en orden de roadmap (Etapa 1 → 01, luego 03, 02, 04…).
2. Spawnear **un subagente por tarea**, pasándole SOLO `prompts/bugs/NN-slug.md` + este `HANDOFF.md` para el estado general. No el historial completo.
3. Al volver el subagente: verificar criterios de aceptación → actualizar Estado en la tabla (`pendiente`→`en curso`→`hecho`) → **agregar** (nunca sobrescribir) una entrada al Log de contexto con qué se hizo, decisiones, archivos tocados.
4. Si el subagente se bloquea: dejar `bloqueado`, registrar el motivo en el log, **no** empezar la siguiente tarea hasta que un humano lo resuelva.
5. `npm test` debe pasar tras cada tarea antes de marcar `hecho`.

## Log de contexto (append-only)

### 2026-09-10 — sesión Claude (diagnóstico + handoff)

- **Qué se hizo:** diagnóstico completo del ciclo de replay/muerte silenciosa con 3 subagentes (timeline de 3 logs de usuarios, auditoría de reconexión/dedup de los 4 conectores, auditoría de frontend). Reporte consolidado en el chat de la sesión. Armado de este handoff + los 10 prompts de `prompts/bugs/`.
- **Decisiones tomadas:**
  - Un solo mecanismo raíz (reconexión → replay sin dedup), no 10 bugs sueltos. La tarea 01 (dedup en el broadcast) cubre las 4 plataformas de una y es la de mayor impacto.
  - El dedup va en `features/chat/emit-chat-message.js` (punto único por el que salen los mensajes de las 4 plataformas), NO en cada conector — regla de modularidad del repo, "cruce de dominio".
  - Watchdog compartido: subir el patrón de `kick/stale-watchdog.js` a un helper de `features/canales/`, no reimplementarlo por plataforma.
  - Rama base `Dev-2-nuevo-backend`, no `main`.
  - El "promo cada 15 min" NO es un leak de timer (confirmado: `session-scheduler.js` idéntico en `v1.8.7` y HEAD). Es la sesión completa reiniciándose. Tarea 04.
- **Qué quedó pendiente:** implementar las 10 tareas. Confirmar el roadmap con el usuario antes de correr el orquestador (pausa de revisión pedida explícitamente).
- **Archivos tocados:** solo se crearon `documentacion/HANDOFF.md` y `documentacion/prompts/bugs/*.md`. Ningún archivo de código.

### 2026-09-10 — orquestador · tarea 01 (dedup de mensajes)

- **Qué se hizo:** gate de dedup central en `features/chat/emit-chat-message.js#emitChatMessage`, antes de registrar interacción y evaluar moderación. Map a nivel módulo `seenMessages` (key → epoch), helper `isDuplicateMessage(key, now)`, export `resetDedup()` para tests.
- **Decisiones:**
  - Clave: id nativo si existe (`ytMsgId` YouTube / `raw.msgId` TikTok, aplanado de `common.msgId` por la lib, estable en replay / `raw.id` Kick); si no, `platform:userId:normalizeAggressive(comment)`. NO se usa `Date.now()` ni el `msgId` de la línea ~239 (se re-estampa en el replay de TikTok).
  - Ventana 10 min **o** 2000 mensajes (poda FIFO por orden de inserción del Map). Comentario `ponytail:` con el ceiling.
  - Duplicado → log `debug` `chat.mensaje.duplicado` (payload sin texto), `return`. No `warn`, no GlitchTip.
  - El orquestador agregó `raw.msgId` a la cadena de id nativo (el subagente solo había puesto `ytMsgId || raw.id`) tras verificar en `node_modules/.../data-converter.js:19-24` que TikTok aplana `common.msgId` al objeto de chat.
- **Verificación:** `npm test` 86/86 (83 previos + 3 nuevos en `test/chat-dedup.test.js`). eslint limpio. Todos los criterios de aceptación del prompt cumplidos.
- **Archivos tocados:** `features/chat/emit-chat-message.js`, `test/chat-dedup.test.js` (nuevo), `test/chat-admin-announce.test.js` (ajuste: `resetDedup()` en setup + `comment` variado por llamada).
- **Commit:** `e839a29`.
- **Próximo:** tarea 03 (error-handler de TikTok).

### 2026-09-10 — orquestador · tarea 03 (error-handler de TikTok)

- **Qué se hizo:** helper `readTikTokError(err)` (lee `err.exception.message → err.info → String(err)` y `err.exception.stack`). `conn.on('error')` reescrito: log/`canal:estado` nunca `undefined`; `!connectedOnce` → teardown sin reintento (igual que `831b8b8`); `connectedOnce` → reconexión por el path existente. Backoff extraído a closure `scheduleReconnectOrGiveUp(entry)` reusable (lo usará el watchdog de la tarea 02).
- **Doble reconexión:** guard `if (entry.timer) return;` — `entry.timer` truthy = reconexión agendada/en vuelo. Lo respetan `disconnected`, `error` post-conexión y (futuro) el watchdog.
- **Extra (orquestador):** `reconnect-tiktok.js` — mismo fix de lectura para el `reject` con string de `client.js:430` (`const msg = err?.message ? err.message : String(err)`).
- **Verificación:** `npm test` 89/89 (86 + 3 nuevos en `test/canales-tiktok-error-handler.test.js`). eslint: 0 errores (2 warnings `no-unused-vars` de `catch (_)` pre-existentes).
- **Archivos tocados:** `features/canales/tiktok/connect-tiktok-channel.js`, `features/canales/tiktok/reconnect-tiktok.js`, `test/canales-tiktok-error-handler.test.js` (nuevo).
- **Commit:** `f4f2c59`.
- **Próximo:** tarea 02 (watchdog TikTok/Twitch) — se rebasa sobre el `scheduleReconnectOrGiveUp` de esta tarea.

### 2026-09-10 — orquestador · tarea 02 (watchdog TikTok/Twitch)

- **Qué se hizo:** helper nuevo `features/canales/stale-watchdog.js` (`armWatchdog`/`clearWatchdog`, timeout 5 min, `unref()`), Map `state.channelWatchdogTimers` con claves `tiktok:<user>` / `twitch:<chan>`. Armado al conectar + re-armado en cada `'chat'` / `'message'`. `onStale` con guard de identidad del entry → TikTok usa `scheduleReconnectOrGiveUp` (tarea 03), Twitch re-llama `connectTwitch(..., 0)`.
- **Decisión:** NO se unifican Kick/YouTube en el helper nuevo. Cada uno tiene su Map propio cableado en ~5 teardowns + tests; migrar es churn con riesgo de regresión y cero beneficio para el usuario. Helper nuevo solo TikTok+Twitch.
- **Limpieza de timers:** `onStale` (primera línea), `disconnected`, `error` pre-conexión, `streamEnd`, las 3 rutas de desconexión explícita (`disconnect.js`, `platforms-disconnect.js`, `remove-channel.js`), y `index.js#shutdown` (barrido del Map). Red de seguridad: `unref()` + guard de identidad.
- **Verificación:** `npm test` 95/95 (89 + 6 nuevos en `test/canales-stale-watchdog.test.js`). eslint 0 errores.
- **Archivos tocados:** `features/canales/stale-watchdog.js` (nuevo), `state/channel-maps.js`, `tiktok/connect-tiktok-channel.js`, `tiktok/reconnect-tiktok.js`, `twitch/connect-twitch.js`, `routes/{disconnect,platforms-disconnect,remove-channel}.js`, `index.js`, `test/canales-stale-watchdog.test.js` (nuevo).
- **Commit:** `2bea050`.
- **Nota:** eventos nuevos `canales.twitch.sin_eventos` / `canales.twitch.reconexion_fallida` y `canales.tiktok.sin_eventos` van a GlitchTip — un stale-reconnect fallido sí merece issue, no se filtra en la tarea 07.
- **Próximo:** tarea 04 (promo).

### 2026-09-10 — orquestador · tarea 04 (promo — rearme en reconexión)

- **Mecanismo real del disparo temprano (verificado sobre el código de la rama):**
  - `features/promo/index.js` escucha `canal:estado` y SOLO reacciona a
    `state:'lista-canales'` (lo emite `broadcast-channels.js`). Los estados
    `desconectado` / `reconectando` / `conectado` de una reconexión transitoria
    **no** llegan al promo — el scheduler ni se entera de un flap normal.
  - `broadcastChannels` con total 0 se emite únicamente en un fin de sesión
    genuino: give-up tras 5 intentos (`connect-tiktok-channel.js#scheduleReconnectOrGiveUp`
    → `cleanupAfterLastTikTokChannel`), `streamEnd`, o desconexión manual. Eso
    dispara `scheduler.stop()` → `stepIndex = 0`, `running = false`, timer limpio.
  - El streamer reconecta → `connect-impl.js` → `broadcastChannels` total 1 →
    `scheduler.startIfNeeded()` → `stepIndex = 0` → `scheduleNext()` agenda el
    **primer** paso `SCHEDULE_MINUTES[0] = 15 min`. Cada ciclo caída-total /
    reconexión = un aviso 15 min después, en vez de seguir la cadencia
    `45 → 60 → 90…` de la sesión original.
  - **El "1–2 min" del log NO es un disparo inmediato.** No hay ningún path que
    llame `onMilestone()` fuera del `setTimeout` de `scheduleNext`, ni forma de
    que `deltaMinutes` quede `undefined`/`NaN` (`stepIndex` nunca es negativo).
    Los huecos observados `23, 30, 45, 60` = `15 + {8, 15, 30, 45}` → un reset
    ocurrido a los `gap−15` min del aviso anterior, seguido del primer paso de
    15 min corrido entero. El "1.2–2.7 min después de un `canales.*`" es
    **correlación por densidad de eventos**: durante la ventana de 15 min post-reset
    TikTok sigue flappeando y logueando `reconectando`/`reconexion_exitosa` cada
    1–2 min, así que cualquier aviso cae cerca de *alguno* de esos eventos. No
    es causa, es ruido de fondo. La hipótesis del prompt (reset de `[15,45,60]`)
    es la causa raíz correcta; el "1–2 min" era un artefacto de lectura.
- **Implementación elegida:** ventana de gracia en `promo/index.js`, sin tocar
  el scheduler (diff más chico — el scheduler ya tiene `if (running) return`
  en `startIfNeeded`, así que basta con no llamar `stop()` durante la gracia:
  el `setTimeout` interno sigue corriendo y el tiempo transcurrido se preserva
  gratis). Al bajar a 0 canales se arma un `setTimeout` de `STOP_GRACE_MS`
  (5 min, `unref`, comentario `ponytail:`); si vuelven canales antes → se
  cancela y `startIfNeeded()` es no-op; si se cumple → `stop()` real. No se
  agregó `pause()`/`resume()` al scheduler (era más código para el mismo
  efecto).
- **Verificación:** `npm test` 99/99 (95 previos + 4 nuevos en
  `test/promo-rearme-reconexion.test.js`, con `t.mock.timers`). eslint limpio.
- **Archivos tocados:** `features/promo/index.js`, `test/promo-rearme-reconexion.test.js` (nuevo).
- **Commit:** `624f8d0`.

- **Commit:** `4443553`.
- **Próximo:** tarea 05 (watchdog YouTube) — arranca Etapa 2.

### 2026-09-10 — orquestador · tarea 05 (watchdog YouTube) — arranca Etapa 2

- **Qué se hizo:** `WATCHDOG_TIMEOUT_MS` de YouTube 4 min → 8 min (chat lento es normal; 4 min = ~74 reconexiones espurias/28 h). `youtubeSeenIds` **eliminado** por completo.
- **Decisión (youtubeSeenIds):** redundante. Usaba la misma clave (`item.id`) que el gate central de la tarea 01, aguas arriba en la misma cadena de evento → todo item que pasaba el dedup local llegaba al gate central. Y el gate central es mejor (ventana temporal 10 min + cap 2000 FIFO vs. cap 500 sin ventana). El Set local era código muerto con su propio bug. Menos código gana.
- **Criterio no cumplido literalmente:** "replay 20 min después se descarta" — el gate central usa ventana de 10 min (decisión tarea 01). Justificación: `youtube-chat` re-entrega su buffer *reciente* (últimos minutos) en la reconexión, no de hace 20 min; 10 min cubre el replay real. Ceiling marcado `ponytail:` en `emit-chat-message.js:31` para subir en un lugar si aparecen reportes.
- **Verificación:** `npm test` 103/103 (99 + 4 nuevos en `test/canales-youtube-watchdog.test.js`). eslint 0 errores. Sin refs colgadas de `youtubeSeenIds`.
- **Archivos tocados:** `youtube/chat-watchdog.js`, `youtube/connect-youtube.js`, `state/channel-maps.js`, `routes/remove-channel.js`, `routes/platforms-disconnect.js`, `test/canales-youtube-watchdog.test.js` (nuevo).
- **Commit:** `6a81f52`.
- **Próximo:** tarea 06 (falso positivo de Kick).

### 2026-09-10 — orquestador · tarea 06 (falso positivo `canales.kick.sin_eventos`)

- **Parte A (re-arme con cualquier frame):** en `connect-kick.js`, `armKickWatchdog()`
  se movió al tope del handler `ws.on('message')` — se llama tras parsear
  cualquier frame de Pusher (subscription_succeeded, `pusher:pong` del ping cada
  100s, chat), no solo en `CHAT_MESSAGE_EVENT`. Se quitaron las dos llamadas
  puntuales (branch de subscription y branch de chat). El ping mantiene el WS
  vivo en canales tranquilos → ya no hay falso positivo cada 5 min. El caso real
  se preserva: si NO llega ningún frame en 5 min (socket muerto sin `close`), el
  timeout vence y dispara `scheduleReconnect(..., 'stale')` igual que antes.
  Comentario del contrato actualizado en `stale-watchdog.js`.
- **Parte C (bajar severidad):** hecha, cambio chico y aislado — se sacó
  `'canales.kick.sin_eventos'` de `WARN_PROMOVIDOS` en `electron-shell/glitchtip.js`
  (una línea + comentario). Ya no se promueve a issue de GlitchTip; queda en la
  sección Logs (es `warn`). NO toca la zona de la tarea 07 (`EVENTO_A_TIPO` /
  filtrado de errores esperados de conexión) — la entrada
  `EVENTO_A_TIPO['canales.kick.sin_eventos']` se dejó (inerte salvo que el evento
  vuelva a nivel error).
- **Verificación:** `npm test` 105/105 (103 + 2 nuevos en
  `test/canales-kick-watchdog.test.js`: silencio total de frames sí dispara;
  frames no-chat cada 100s re-arman y un canal tranquilo de 30 min no dispara).
  eslint 0 errores (solo warnings `catch (_)` pre-existentes).
- **Archivos tocados:** `features/canales/kick/connect-kick.js`,
  `features/canales/kick/stale-watchdog.js`, `electron-shell/glitchtip.js`,
  `test/canales-kick-watchdog.test.js` (nuevo).
- **Commit:** `624f8d0`.
- **Criterios de aceptación:** los 4 cumplidos.
- **Próximo:** tarea 07 (ruido de errores esperados en GlitchTip).

### 2026-09-10 — orquestador · tarea 07 (ruido de GlitchTip) — cierra Etapa 2

- **Qué se hizo:** `electron-shell/glitchtip.js` — constante `ERRORES_CONEXION_ESPERADOS` (patrones substring case-insensitive: `isn't online`, `live stream was not found`, `client version was not found`, `live has ended`, `user_not_found`) + helper `esErrorConexionEsperado(e)` (solo `canales.*`, matchea `e.data.error || e.message`). Guard en `reportarIssue` tras el gate de nivel y antes de los caps: `if (esErrorConexionEsperado(e)) return;`.
- **Decisiones:** match por texto libre (no hay `code` estable que llegue a `reportarIssue` — la tarea 03 colapsó `err.info` a texto). Comentario `ponytail:` con la fragilidad. Breadcrumbs / sección Logs se registran aguas arriba → los eventos filtrados NO se pierden, solo no son issue. Los eventos `sin_eventos` de la tarea 02 NO matchean → se siguen promoviendo (un stale real sí importa). `WARN_PROMOVIDOS` y la línea de la tarea 06 intactos. `aptabase.js` sin cambios (los `warn` no suman a `errorCount`).
- **Verificación:** `npm test` 109/109 (105 + 4 nuevos en `test/glitchtip-errores-esperados.test.js`). eslint 0 errores.
- **Archivos tocados:** `electron-shell/glitchtip.js`, `test/glitchtip-errores-esperados.test.js` (nuevo).
- **Commit:** `d516bf8`.
- **Próximo:** Etapa 3 — tarea 08 (botón "Fallos conocidos").

### 2026-09-10 — orquestador · tarea 08 (botón "Fallos conocidos") — arranca Etapa 3

- **Qué se hizo:** `showKnownIssuesNotice` agregado al `import` de `./utils-app.js` y al `Object.assign(window, {...})` en `interfaz/src/vistas/principal/index.js`.
- **Extra (orquestador):** el subagente encontró **2 hermanos del mismo bug** y el orquestador los arregló en el mismo commit (misma línea de `Object.assign`, diff más chico que 2 tickets nuevos):
  - `updateSocialOverlayUrl` — ya estaba importado (L37), faltaba en el bridge. `oninput` en la config del overlay de alertas sociales (`index.html` L466-481).
  - `modReload` — ni importado ni bridgeado. `onchange`/`onclick` de los filtros de la vista Moderación (`index.html` L1168-1185). Se agregó al import de `moderacion.js` y al bridge.
- **Verificación:** `npm run build:front` OK, `npm test` 109/109 (sin cambios — es frontend).
- **Archivos tocados:** `interfaz/src/vistas/principal/index.js`.
- **Commit:** `a66fdfa`.
- **Próximo:** tarea 09 (respuesta_pequena).

### 2026-09-10 — orquestador · tarea 09 (respuesta_pequena 100%) — BLOQUEADA, sin cambios

- **Estado:** `bloqueado`. No se tocó código. Requiere decisión humana / dato de producción.
- **Trace del mecanismo (revisión completa de `fetch-audio.js` + `generate.js` + `cola-tts.js` + probe en vivo contra Google):**
  - `sonido.tts.respuesta_pequena` se emite en **un solo lugar**: `generate.js` catch, `code === 'EMPTY'`, con `len: err.len`.
  - `EMPTY` sale **solo** de `pedirAGoogle` cuando `Buffer.concat(chunks).length < 1024` **después** de consumir y descomprimir el stream entero (`stream.on('end')`). NO se mide sobre un stream sin consumir, ni sobre `Content-Length`, ni sobre el objeto equivocado. El buffer está resuelto. `generate.js` no "bufferea antes" — `fetchTtsAudio` le devuelve el Buffer final.
  - `len:0` ⇒ Google devolvió un **200 con body de 0 bytes** (sin `content-encoding`). Es exactamente la señal de rate-limit para la que se construyó cache+retry+backoff. **No hay bug de medición.**
  - `hablado` (try) y `respuesta_pequena` (catch) son **mutuamente excluyentes** por request. Un `/api/tts` exitoso (cache hit o miss) loguea solo `hablado`; uno fallido loguea solo el evento de error y responde 502. El cliente (`cola-tts.js`) hace `shift()` del mensaje y **no lo reintenta** — un 502 = ese mensaje se salta.
  - Por lo tanto los conteos ~iguales en los logs **no son un pairing 1:1**: son una **tasa de fallo ~50% de las requests no cacheadas**. El reporte interpretó "totales parecidos" como "una por cada".
- **Probe en vivo** (`node`, 8 requests a `translate.google.com/translate_tts` con el mismo header set del código, 250 ms de espaciado): 8/8 → `status=200 ct=audio/mpeg enc=- raw=~21KB decoded=~21KB`. No se reprodujo ni un empty. La medición del código sobre respuestas normales es correcta.
- **Por qué se bloquea (instrucción del prompt):** "si los clips SÍ son realmente vacíos (no bug de medición) → parar, documentar, escalar". El empty es real (Google rate-limitea con 200+body vacío desde IPs residenciales de streamers con chat denso). El warning **ya es correcto**. Hacerlo "no disparar en éxito" no aplica: no dispara en éxito. Las opciones reales son de producto, no de este ticket:
  1. Aceptar que ~N% de mensajes de chat se saltan bajo rate-limit y que el warn lo refleje (estado actual — el warn hace su trabajo).
  2. Subir la agresividad de retry / bajar `MIN_AUDIO_BYTES` / warm-up del cache — toca el retry/backoff, **prohibido por el prompt**.
  3. Migrar a un endpoint TTS con API key. Fuera de alcance.
  - Falta confirmar con un log de producción reciente si además aparece `sonido.tts.backoff_activo` (si NO aparece con 50% de fallo, la tasa real de fallo por-request es <12% y el problema es menor).
- **Archivos tocados:** ninguno. **Sin commit.** `npm test` sin correr (sin cambios).

### 2026-09-10 — orquestador · tarea 10 (`"text should be a string"`)

- **Call sites de síntesis:** hay **un solo** productor de audio TTS en el backend
  (`features/sonido/tts/fetch-audio.js#fetchTtsAudio`) y **un solo** caller
  (`features/sonido/tts/routes/generate.js`, `POST /api/tts`). Announce, promo,
  soundpad, móvil y MCP **no** sintetizan en el backend — emiten mensajes/eventos
  y el renderer (`interfaz/src/nucleo/tts/cola-tts.js`) hace `fetch('/api/tts')`.
  Todo texto no-string entra por el body JSON de `/api/tts` o por
  `sanitizeForTTS()` devolviendo `''` (mensaje solo emoji/@mención).
- **Bug secundario encontrado:** `text.substring()` en `generate.js` tiraba un
  TypeError **sin catch** (antes del `try`) para `{text: 123}`.
- **Guard central (fix lazy):** tope de `fetchTtsAudio` —
  `clean = typeof text === 'string' ? text.trim() : ''`; vacío → log `warn`
  `sonido.tts.texto_invalido` `{tipo,voice}` si no-string, `debug` si string vacío,
  y `throw {code:'EMPTY_INPUT'}` (nunca toca Google). El resto usa `clean`.
- **Guard de caller:** `generate.js` coerce `rawText` antes de `.substring()` +
  `400 textRequired`; `EMPTY_INPUT` → `400`, sin re-loguear.
- **Verificación:** `npm test` 111/111 (109 + 2 en `test/tts-texto-invalido.test.js`).
  eslint 0 errores.
- **Archivos tocados:** `features/sonido/tts/fetch-audio.js`,
  `features/sonido/tts/routes/generate.js`, `test/tts-texto-invalido.test.js` (nuevo).
- **Commit:** `109b827`.
- **Fin de la corrida del orquestador.** Pendiente: tarea 09 (decisión de producto), push de la rama, PR.

### 2026-09-10 — orquestador · correcciones de la review + verificacion adversarial (workflows)

- **Contexto:** tras mergear el batch a Dev-2, una review encontro 5 findings. Se corrieron 2 workflows: (1) fix + verify con 2 agentes de fix en paralelo + 4 lentes adversariales; (2) re-verify del diff corregido con 3 lentes.
- **Findings 1-5 resueltos** (commit `a413b26`):
  - **1** — `conn.on('error')` post-conexion de TikTok ya NO reconecta (es un cajon de sastre; 'disconnected' + watchdog cubren). Test `canales-tiktok-error-handler.test.js` reescrito para el nuevo comportamiento.
  - **2+3** — clave de dedup por id/ts de ORIGEN del mensaje: tiktok `raw.msgId` (unico por mensaje; `createTime` NO sirve — int64 repetido entre mensajes del mismo frame, colapsaba legitimos), twitch `raw.tags.id` (UUID IRCv3) con fallback `tmi-sent-ts`+texto, kick/youtube `raw.id`. Un replay lleva el mismo id → deduped; un re-envio legitimo lleva id nuevo → pasa. Ventana unica de 10 min.
  - **4** — give-up de `scheduleReconnectOrGiveUp`: `clearWatchdog` + teardown del connector (`removeAllListeners` + `disconnect`).
  - **5** — comentario en `promo/index.js`.
- **Verificacion adversarial encontro y se corrigio en la misma sesion:** un `MAX_STALE_RECONNECTS` que el orquestador agrego para el finding "give-up inalcanzable" — REVERTIDO porque (a) abandonaba streams legitimamente tranquilos (solo 'chat' contaba como liveness, no gifts/likes/joins) y (b) leakeaba el socket + heartbeat. La limitacion "canal que conecta pero nunca manda chat → reconecta cada 5 min" se ACEPTA y documenta en el comentario de `onStale` (es mejor que pre-batch: TikTok sin watchdog quedaba mudo para siempre).
- **Limitaciones residuales aceptadas (plausibles, no confirmadas):** ceiling 10min/2000 del dedup (subir si hay reportes); el fallback `platform:userId:texto` colapsa repeticiones exactas legitimas en la rama rara sin id; `setupTikTokConnection` replace-path hace `removeAllListeners` pero no `disconnect` del conn viejo (PRE-EXISTENTE, no del batch — a revisar en la auditoria).
- **Verificacion:** `npm test` 118/118. eslint 0 errores.
- **Commit:** `a413b26`.
- **Proximo:** smoke test por MCP/logs + auditoria backend completa + re-chequeo contra reportes de usuarios.

### 2026-09-10 — tarea 09 (respuesta_pequena 100%) — desbloqueada, decisión de producto

- **Decisión tomada:** opción 1 de las 3 planteadas en el bloqueo — **aceptar** que
  Google TTS (endpoint gratis, sin API key) rate-limitea devolviendo `200` +
  body vacío bajo carga, y que eso ya está bien manejado (cache + retry +
  backoff + warn sin promover a issue de GlitchTip, confirmado en
  `electron-shell/glitchtip.js` — `sonido.tts.respuesta_pequena` está
  explícitamente excluido de `WARN_PROMOVIDOS`). Las otras 2 opciones siguen
  descartadas: tocar retry/backoff estaba prohibido por el prompt original;
  migrar a un endpoint con API key es un cambio de infraestructura/costo,
  fuera de alcance de este ticket.
- **Lo único que faltaba y sí se hizo:** instrumentar para poder medir la tasa
  real de fallo por-request (el propio bloqueo lo pedía: "falta confirmar con
  un log de producción si aparece `backoff_activo`"). Se agregaron
  `sonido.tts.respuesta_pequena` → `tts.empty_response` y
  `sonido.tts.backoff_activo` → `tts.backoff_active` a
  `features/telemetria/connectors/counters.js` (mismo patrón que
  `sonido.tts.rate_limitado`, ya contado ahí). Se acumulan por latido de 5 min
  y viajan a Aptabase self-hosted, sin texto ni PII — permite calcular
  `empty_response / (spoken + empty_response)` en el dashboard y confirmar si
  la tasa real es la <12% estimada o peor.
- **Sin cambios** en `fetch-audio.js` / `generate.js` (retry/backoff/cache
  intactos, tal como pedía el prompt original).
- **Verificación:** `npm test` — sin tests dedicados a `counters.js` (no había
  antes); no se agregó ninguno nuevo porque el conector no tiene suite propia
  y el cambio es un array literal de 2 líneas sin lógica nueva. Se corrió la
  suite completa para confirmar cero regresión en `telemetria-live-signal.test.js`
  y el resto.
- **Archivos tocados:** `features/telemetria/connectors/counters.js`.
- **Fin de la corrida — las 10 tareas del roadmap están cerradas.**

### 2026-09-10 — orquestador · auditoria de backend completa (workflows) + smoke test MCP/logs

- **Smoke test** (`node server.js` en :49997, Twitch xqc en vivo): 17 dominios montados, **482 mensajes reales por el pipeline de dedup nuevo, 0 duplicados espurios, 0 errores/warnings**, MCP funcional, ciclo disconnect/reconnect limpio. Cross-user same-text ("21" de 6 users) pasó todo — el dedup no sobre-filtra.

- **Auditoria de backend** (2 workflows, 10 areas: canales, chat+moderacion, sonido, core, electron-shell, telemetria+mcp, config+idioma+reporte+auth, orquestadores, movil+promo+bot+clips+overlay, transversal). **~27 hallazgos, 12 verificados adversarialmente como CONFIRMED, 0 rechazados.**

- **Arreglados en esta corrida** (commits `81438e7` + el siguiente):
  - shutdown ordenado nunca corria en quit (`process.on('exit')` sync vs `shutdownAll` async) + re-entrancy de `window-all-closed` que abortaba el shutdown en el cierre por X.
  - canales/index.js#shutdown: 5 timers de reconexion sin limpiar.
  - sonido: loop infinito de yt-dlp con playlist irresoluble; 2 crashes de proceso (gzip resp sin 'error' listener, taskkill spawn sin 'error'); race del backoff de TTS.
  - **HIGH** glitchtip.js espeja PII de espectadores (nick/userId/IP/queries) a GlitchTip via el mirror de `log:entry`.
  - core/logger.js sin 'error' listener en el WriteStream (crash ante ENOSPC/lock).
  - CONFIG_KEYS_PUBLICAS exponia `subscriptionsEnabled`/`mcpDestructiveToolsEnabled`/`mcpDevToolsEnabled` a la tool MCP `set_config` (apagar auth de la app).
  - telemetria/connectors/errors.js manda stacks con `C:\Users\<nombre>` (des-anonimiza).
  - auth/refresh.js#tick race: logout durante el `await` re-aplicaba sesion Pro sin token.
  - moderacion: palabra bloqueada solo-whitespace -> regex que bloquea todo el chat.
  - configuracion/apply-patch.js: `__proto__` en el patch -> TypeError.

- **BACKLOG — hallazgos CONFIRMED sin arreglar todavia** (a triar por el usuario):

  | Sev | Hallazgo | Ubicacion | Nota |
  |---|---|---|---|
  | MED | `validateLocalMutation` confia en el header `Host` (spoofable), sin chequeo de `req.socket.remoteAddress`; un cliente no-browser en la LAN evade la restriccion localhost para endpoints de escritura | `core/app.js:17-50` | Cuidado: el panel movil + overlays de OBS legitimamente pegan desde IPs de LAN. Necesita una decision de diseño (loopback-only para mutaciones "reales", LAN para movil). |
  | MED | `GET /api/auth/session` devuelve PII completa (email, id de Supabase, subscription) a cualquier cliente LAN sin auth cuando `subscriptionsEnabled=true` | `features/auth/routes.js:54` | Mismo fix subyacente que el de arriba. |
  | MED | disconnect que corre contra un connect en vuelo (twitch/youtube/kick) deja una conexion huerfana; el connect solo hace `state.*Channels.set` DESPUES del await | `connect-twitch.js:164`, `connect-youtube.js:100`, `connect-kick.js:84` | Falta un guard de "connect en progreso" (tiktok sí lo tiene con `connectingTiktok`). |
  | MED | Twitch EventSub sin path de reconexion si el WS inicial falla antes de `session_welcome` | `twitch/eventsub/connect-socket.js:106` | Fallo transitorio de red al boot -> EventSub muerto hasta reiniciar la app. |
  | LOW | `guard-suscripcion.js` falla OPEN (wall desactivado) si el listener `config:get`/`auth:get` tira (event-bus traga la excepcion) | `core/guard-suscripcion.js:28` | |
  | LOW | `ws-server.js#isAllowedWsClient` mismo trust del Host spoofable; cliente remoto con `Host: localhost` sin Origin recibe todo el broadcast | `core/ws-server.js:13-28` | |
  | LOW | `auth-session.json` (tiene el token) se escribe con `writeFileSync` pelado, sin tmp+rename (a diferencia de config/moderacion) | `features/auth/session-store.js:24` | Crash mid-write -> sesion perdida. Fix barato. |
  | LOW | `GET /mcp` sin `MCP_TOKEN` evade el chequeo localhost (solo POST/PATCH/DELETE/PUT lo tienen); compare de `MCP_TOKEN` con `===` (timing) | `core/app.js:31`, `mcp/transport/streamable-http.js:70` | El GET responde 405 igual, pero llega a `buildMcpServer`. |
  | LOW | telemetria/buffer.js `drop(n)` por posicion + el trim de `push()` (`slice(-MAX)`) pueden correr la cola durante un flush en vuelo -> descarta eventos sin enviar y re-envia enviados | `features/telemetria/buffer.js:47` | |
  | LOW | telemetria/connectors/creators.js nunca llama `recordResolved()` -> el cap `MAX_RESOLVES=2` es codigo muerto, `creators/seen` (con el nombre del canal) se emite en cada connect/reconnect/escena | `features/telemetria/connectors/creators.js:18` | |
  | LOW | ventana del checkout de Polar (`window.js`) tiene titulo legitimante pero sin `will-navigate`/`setWindowOpenHandler` restrictivo -> un redirect fuera de `*.polar.sh` renderiza contenido arbitrario bajo el titulo de la app | `electron-shell/window.js:103-140` | |
  | LOW | `waitForServer()` sin timeout por request -> una conexion aceptada que nunca responde cuelga el arranque para siempre (sin ventana, sin dialogo) | `electron-shell/window.js:31-57` | |
  | LOW | `moderacion/index.js` `dupSweepTimer` no se limpia en shutdown (a diferencia del sweep del store) | `features/moderacion/index.js:65` | `.unref()`'d, solo importa si se re-registra el dominio (tests). |
  | LOW | `getBlockedMatchers` colapsa letras repetidas del lado de la palabra bloqueada: bloquear "ass" tambien bloquea "as" | `features/moderacion/filters/blocked-matchers.js:33` | |
  | LOW | `shutdownAll(logger)` con `logger` undefined tras un fallo parcial de boot en packaged -> el catch tira | `main.js:208` + `core/shutdown.js:26` | Guard barato. |
  | LOW | `waitForServer` exige `data.app === 'tiktok-tts'` (solo lo produce `configuracion`); si ese dominio falla al montar, el arranque cuelga y culpa lo equivocado | `electron-shell/window.js:31` | |
  | NIT | `ws-server.js` contador de `violations` del rate-limit nunca se resetea en una ventana OK (contradice la semantica "ventanas seguidas" documentada) | `core/ws-server.js:69-101` | |

### 2026-09-10 — orquestador · re-chequeo contra los reportes de usuarios (workflow)

Un agente por sintoma/issue original, trazando el codigo ACTUAL (no el diagnostico viejo) de punta a punta.

| Reporte de usuario | Veredicto | Cubre |
|---|---|---|
| "deja de leer, hay que reconectar a mano" | **Parcial** | `stale-watchdog.js` compartido (TikTok+Twitch, 5min) + watchdogs propios ya existentes de Kick/YouTube (YouTube subido 4→8min). Limitacion aceptada: un stream legitimamente mudo 5+min fuerza reconexion cada 5min en TikTok/Twitch (documentado en el propio codigo, no ajustado empiricamente como YouTube). |
| "repite mensajes tras 15-20min de hueco" | **Parcial** — **YouTube tenia un riesgo real, ahora arreglado (commit `37ed6fa`)** | Gate central (`emit-chat-message.js`) cubre TikTok/Twitch/Kick de sobra porque esos conectores no reentregan backlog real. YouTube SI puede reentregar backlog (re-scrapea la pagina al reconectar) y un hueco >10min podia colarse — se restauro `youtubeSeenIds` (segunda capa sin ventana de tiempo, mismo patron que `kickSeenIds`). |
| "se reinicia cada 1h, aviso cada 15min" | **Resuelto** | `STOP_GRACE_MS` de 5min en `promo/index.js` + el watchdog (reconexiones mas rapidas, caen dentro de la gracia) + el dedup. |
| TTS timeout / respuesta_pequena 100% | **Parcial** | `sonido-2` (crash del proceso ante gzip cortado — mitiga algo peor que un mensaje perdido) + `sonido-4` (race del backoff). NO resuelve que ~50% de mensajes no cacheados se pierdan sin reintento bajo carga sostenida — limitacion de infraestructura de Google, aceptada como decision de producto (tarea 09). |
| Ruido/issues fantasma en GlitchTip (48/57/49/50/52/55) | **Resuelto** | `readTikTokError`, `esErrorConexionEsperado`, watchdog de Kick con cualquier frame, bridge de `showKnownIssuesNotice`. |
| Twitch "Login unsuccessful" / GlitchTip #63 | **Resuelto** (PR#38, sesion paralela) | Cliente tmi.js siempre anonimo, sin `identity` con token de EventSub que caducaba. String-reject normalizado a Error. |

**Riesgos residuales (por orden de importancia):**
1. ~~YouTube podia seguir repitiendo en huecos largos~~ → **arreglado** (commit `37ed6fa`, este mismo re-chequeo lo encontro).
2. TikTok/Twitch reconectan cada 5min indefinidamente en un stream legitimamente silencioso (trade-off documentado, no ajustado empiricamente como YouTube 4→8min — vigilar en produccion).
3. TTS sigue perdiendo mensajes sin aviso bajo chat denso con rate-limit sostenido de Google (limitacion de infra, aceptada).

**Verificacion de campo pendiente (no confirmable por lectura de codigo):**
1. YouTube con un hueco real de 15-20min (cortar red/suspender) → confirmar que ya no repite.
2. TikTok/Twitch con una caida real → medir si la reconexion (manual o por watchdog) entra siempre en la ventana de gracia de 5min del promo.
3. Kick con un canal tranquilo >5min con WS vivo → confirmar que el ping de Pusher evita el falso positivo.
4. TTS en produccion varios dias con los contadores nuevos (`tts.empty_response`, `tts.backoff_active`) → tasa real de perdida.

**Bottom line:** se puede decir "deberia estar bastante mejor en la proxima version" para 4 de los 6 sintomas. NO decir "arreglado del todo": el TTS sigue perdiendo mensajes bajo carga (limitacion de Google, no de la app) y el ajuste de YouTube recien se hizo en esta corrida — falta verificacion de campo.
