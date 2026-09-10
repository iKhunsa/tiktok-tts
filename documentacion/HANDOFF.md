# Handoff — TikLive TTS · Bugs de canales / replay / observabilidad

Última actualización: 2026-09-10 por sesión Claude (reporte de errores + armado de handoff)

## Estado general

App en producción **v1.8.7**. Los usuarios reportan que el TTS deja de leer
mensajes nuevos y, tras un hueco de inactividad o ~1 h, re-lee todo el chat ya
leído. El diagnóstico está cerrado (ver `reporte-errores-canales.md` más abajo):
un solo mecanismo raíz (reconexión de conector → replay de backlog sin dedup) +
dos amplificadores (TikTok muere en silencio, YouTube reconecta cada 4 min).
El diagnóstico completo (evidencia de logs, traza de código, tabla comparativa
de los 4 conectores) está en la primera entrada del Log de contexto y repartido
en el `## Contexto` de cada prompt de `prompts/bugs/`. Este handoff descompone
el fix en tareas accionables. **Nada del fix está implementado todavía.**

Rama base para el trabajo: `Dev-2-nuevo-backend` @ `831b8b8` (ya trae
suscripciones-auth + telemetría live-signal mergeadas, aún sin pushear).
Crear rama `fix/canales-replay-watchdog` desde ahí.
> Alternativa descartada por ahora: basar en `main`/`v1.8.7` para un hotfix
> independiente. Se eligió `Dev-2` porque es el tronco de la próxima release y
> las tareas tocan archivos que suscripciones-auth ya modificó.

## Roadmap

- [ ] **Etapa 1 — El ciclo que reportan los usuarios** (replay + muerte silenciosa + promo).
      Tareas 01, 02, 03, 04. Es lo único que el usuario final nota. Sale primero, se puede releasear sola.
- [ ] **Etapa 2 — Calibrar watchdogs existentes y bajar ruido de observabilidad.**
      Tareas 05, 06, 07. No cambia comportamiento visible; limpia GlitchTip y reduce churn de reconexión.
- [ ] **Etapa 3 — Bugs sueltos de frontend / TTS.**
      Tareas 08, 09, 10. Independientes entre sí y del resto.

## Checklist de tareas / bugs

| # | Descripción | Estado | Prioridad | Prompt asociado |
|---|---|---|---|---|
| 01 | Dedup por msgId estable en el broadcast de chat — mata el replay audible en las 4 plataformas | hecho | alta | `prompts/bugs/01-dedup-mensajes-msgid.md` |
| 02 | Watchdog de socket mudo compartido para TikTok y Twitch (patrón de Kick/YouTube) | hecho | alta | `prompts/bugs/02-watchdog-inactividad-tiktok-twitch.md` |
| 03 | `conn.on('error')` de TikTok: leer `err.exception`, no dejar el canal colgado, agendar reconexión post-conexión | hecho | media | `prompts/bugs/03-tiktok-error-handler-incompleto.md` |
| 04 | Scheduler de promo no debe reiniciar la cuenta `[15,45,60]` en una reconexión transitoria | hecho | media | `prompts/bugs/04-promo-rearme-en-reconexion.md` |
| 05 | `chat-watchdog.js` de YouTube: 4 min es muy agresivo; `youtubeSeenIds` sin ventana temporal | pendiente | media | `prompts/bugs/05-youtube-watchdog-agresivo.md` |
| 06 | `canales.kick.sin_eventos` cada 5 min en canal tranquilo — falso positivo, churn de reconexión | pendiente | baja | `prompts/bugs/06-kick-sin-eventos-falso-positivo.md` |
| 07 | GlitchTip: no promover a issue errores de conexión esperados (streamer offline, YouTube no en vivo) | pendiente | baja | `prompts/bugs/07-glitchtip-ruido-errores-esperados.md` |
| 08 | Botón "Fallos conocidos" muerto — `showKnownIssuesNotice` nunca se bridgeó a `window` | pendiente | baja | `prompts/bugs/08-boton-fallos-conocidos-muerto.md` |
| 09 | `sonido.tts.respuesta_pequena` dispara en el 100% de las síntesis con `len:0` | pendiente | media | `prompts/bugs/09-respuesta-pequena-100pct.md` |
| 10 | `Google TTS failed: "text should be a string"` — valor no-string llega a la síntesis | pendiente | baja | `prompts/bugs/10-tts-text-should-be-string.md` |

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
- **Sin commit** (pedido explícito del prompt).

- **Commit:** `4443553`.
- **Próximo:** tarea 05 (watchdog YouTube) — arranca Etapa 2.
