# Handoff — Checklist de fixes de la auditoría de backend (2026-09-11)

Última actualización: 2026-09-11 por orquestador (Claude, sesión `session_01Q9MFAfLH9jmfBdNbmdqy5V`).

## De dónde sale esto

Fuente: `C:\Users\liber\Downloads\AUDITORIA_BACKEND_TIKLIVETTS_2026-09-11.md` — auditoría
de solo-lectura hecha por 12 subagentes especializados + 1 de verificación puntual +
2 de re-verificación adversarial, sobre el 100% de `core/`, `electron-shell/` y los
17 dominios de `features/` (fuera de alcance: `servicio-cuentas`, repo separado).
**63 hallazgos**: 21 Alta, 20 Media, 22 Baja. El reporte completo (con file:line,
impacto e impacto y dirección de fix de cada uno) sigue en esa ruta — este checklist
es un resumen operativo, no lo reemplaza.

Aparte, en la misma sesión se corrió `/ultrareview` (Claude Code) sobre el diff completo
de la rama `Dev-2-nuevo-backend` contra `main`, partido en 2 PRs de solo-lectura
(no mergeados, solo para que el review tuviera dónde comparar):
- **PR #39** (`review-chunk-1`, base `main`): 5 hallazgos "normal" + 2 "nit" — **los 7 ya
  están arreglados** (ver sección "Hallazgos de ultrareview" más abajo).
- **PR #40** (`Dev-2-nuevo-backend`, base `review-chunk-1`): 2 hallazgos "nit" —
  **ya arreglados**.

Ambos PRs siguen abiertos en GitHub solo como referencia de comparación — **no mergear,
`main` es producción**. Se pueden cerrar sin mergear cuando se terminen los fixes de
este checklist.

## Cómo se está trabajando esto (metodología — repetir si continúa otra sesión/IA)

1. El **orquestador** (la sesión principal de Claude Code) explica cada hallazgo en
   criollo al usuario (liber) y pregunta si lo quiere arreglar antes de tocar nada.
2. Si el usuario dice que sí, el orquestador lanza **un subagente nuevo y dedicado
   exclusivamente a ESE hallazgo** (tool `Agent`, `subagent_type` por defecto —
   NO usar `fork`, tiene que arrancar sin contexto previo) con:
   - Un resumen preciso del bug (qué archivo/línea, qué está mal, impacto real).
   - La dirección de fix ya decidida (no dejarle al subagente rediseñar el enfoque).
   - Instrucción de aplicar el criterio de la skill `/ponytail` (mínimo diff, sin
     abstracciones nuevas, reusar lo que ya existe).
   - Instrucción de correr `npm test` (`node --test` nativo, sin mocha — correr
     archivos sueltos con mocha pisa un singleton compartido entre tests y da falsos
     negativos, ver nota más abajo) y reportar pass/fail.
   - Instrucción explícita de **NO commitear** — los cambios quedan en el working tree.
3. El subagente arregla, corre tests, reporta, y muere (no vuelve a usarse).
3. El orquestador verifica el resultado, se lo cuenta al usuario en 2-3 líneas, y pasa
   al siguiente hallazgo de la lista (repetir desde el paso 1).
4. Los hallazgos "Media" y "Baja" (sección de abajo) **todavía no fueron verificados
   contra el código real** — antes de arreglar cualquiera de esos hay que confirmarlo
   primero (mismo proceso que se usó para los 21 "Alta": agentes de lectura que
   comparan la afirmación del reporte contra el código actual, sin asumir que el
   reporte tiene razón).

### Nota importante sobre tests

`npm test` = `node --test` (test runner nativo de Node, cada archivo en su propio
proceso — sin contaminación entre archivos). **NO usar `npx mocha test/a.js test/b.js`
con varios archivos juntos** — varios módulos del repo son singletons `require`-once
(ej. `core/contracts/entitlements.js`) y correr varios test files en el mismo proceso
mocha hace que un test pise el estado global que dejó otro, dando fallos que no son
reales. Baseline conocido: **142/142 tests pasan** en HEAD antes de estos fixes.

## Checklist — Hallazgos "Alta" (21) — todos verificados contra código real

Verificados por agentes de lectura dedicados (no se confió en el reporte a ciegas).
Resultado: 19 confirmados exactos, 2 confirmados con un detalle menor incorrecto
(marcados "parcial" abajo), **0 falsos positivos**.

| # | Archivo | Resumen en criollo | Estado |
|---|---|---|---|
| 1 | `core/shutdown.js` + `main.js` | Al cerrar la app, el presupuesto de 8s se agota antes de que todos los módulos alcancen a cerrar (cierre secuencial de hasta 17 módulos) | ✅ **HECHO** — shutdown ahora en paralelo, no secuencial |
| 2 | `core/ws-server.js` | El contador de "violaciones de rate-limit" nunca se resetea — desconecta overlays/móvil sin motivo tras horas de uso | ✅ **HECHO** — violations ahora se evalúa una vez por ventana, se resetea si la ventana pasó limpia |
| 3 | `electron-shell/ipc-bridge.js` | Podés asignar el mismo atajo a un sonido del soundpad y a TTS sin que la app te avise | ✅ **HECHO** — TTS ahora chequea conflicto contra soundpad y el atajo de clip |
| 4 | `features/clips/index.js` | "Clip guardado" se confirma sin esperar que OBS lo confirme de verdad | ✅ **HECHO** — `saveReplay` ahora espera el `op:7` de OBS (con timeout de 5s) antes de confirmar éxito |
| 5 | `features/canales/tiktok/reconnect-tiktok.js` | Conexión de TikTok queda viva en segundo plano al agotar reintentos | ✅ **HECHO** — teardown (`removeAllListeners`+`disconnect`) agregado en el branch de rendición |
| 6 | `features/canales/kick/connect-kick.js` (timeout) | "Conectar" a Kick puede quedarse colgado para siempre sin error | ✅ **HECHO** — timeout de 20s que corta y reporta error si Pusher nunca confirma |
| 7 | `features/canales/twitch/connect-twitch.js` | Doble conexión a Twitch en paralelo (chat duplicado) + puede borrar la conexión buena por error | ✅ **HECHO** — lock `connectingTwitch` + guard de identidad en `disconnected` |
| 8 | `features/canales/youtube/connect-youtube.js` | Mismo problema que Twitch, en YouTube | ✅ **HECHO** — lock `connectingYoutube` igual que Twitch/TikTok |
| 9 | `features/canales/kick/connect-kick.js` (race) | Mismo problema que Twitch/YouTube, en Kick, en otro punto de la conexión | ✅ **HECHO** — lock `connectingKick`, verificado que no choca con el flujo de auto-reconexión |
| 10 | `features/canales/tiktok/connect-tiktok-channel.js` | Desconectás TikTok, vuelve solo a "conectado" segundos después | ✅ **HECHO** — chequeo de identidad tras el `await connect()`, en try y catch |
| 11 | `features/chat/emit-chat-message.js` | Un link/mención se ve distinto en el chat según de qué plataforma vino | ✅ **HECHO** — `comment` de TikTok ahora pasa por `sanitizeForTTS` igual que las otras 3 |
| 12 | `features/chat/is-admin-identity.js` | Un espectador que copie el nickname del admin consigue inmunidad de moderación | ✅ **HECHO** — nuevo campo `stableHandle` no-spoofeable por plataforma (YouTube queda best-effort, documentado) |
| 13 | `features/moderacion/apply-mod-action.js` (flush) | Banear a alguien puede "decir que sí" aunque no se haya guardado en disco | ✅ **HECHO** — `flush()` devuelve éxito/fallo, la ruta responde 500 si no se guardó |
| 14 | `features/moderacion/store/purge.js` | La lista de espectadores puede crecer sin límite con muchos seguidores acumulados | ✅ **HECHO** — el warn de "sin candidatos" ahora se loguea una sola vez por atasco, no en cada flush (spam de logs resuelto; el criterio de qué se purga no se tocó) |
| 15 | `features/moderacion/apply-mod-action.js` (resolveModTarget) | **El más grave**: la protección "no podés banear al admin/streamer" está rota en el flujo real que usa la UI | ✅ **HECHO** — deriva userId/nick de `parseKey`; verificado a mano con 3 escenarios (admin por id, admin por nick, no-admin) — no había test automatizado para esto |
| 16 | `features/sonido/tts/fetch-audio.js` (límite 200 chars) | Mensajes largos nunca se leen y pueden dejar el TTS mudo un rato | ✅ **HECHO** — truncado a 200 chars antes de llamar a Google (decisión del usuario: cap duro, no split); de paso resuelve la mezcla con el contador de backoff |
| 17 | `features/sonido/tts/fetch-audio.js` (resp.on error) | Un corte de red en pleno error de Google puede crashear toda la app | ✅ **HECHO** — `resp.on('error')` agregado al branch de error, mismo patrón que ya tenía el branch de éxito |
| 18 | `features/sonido/musica/advance-queue.js` | El bot de música corta una canción pedida y arranca otra sola | ✅ **HECHO** — contador de generación (`playbackGen`) invalida resoluciones de playlist obsoletas |
| 19 | `features/sonido/musica/engine/check-for-updates.js` | yt-dlp nunca se autoactualiza — el bot musical "se rompe solo" con el tiempo | ✅ **HECHO** — se llama al pasar a 'ready' + `setInterval` diario de respaldo para sesiones largas |
| 20 | `features/movil/index.js` (remote_command) | Un agente MCP puede silenciar TTS/borrar clips aunque el usuario apagó "herramientas destructivas" | ✅ **HECHO** — `destructive:true` + gate `entitlements.check('panel-movil')` |
| 21 | `features/movil/index.js` (state-sync) | Cualquier dispositivo en la misma WiFi puede hacerse pasar por la app de escritorio | ✅ **HECHO** — exige IP loopback real (127.0.0.1/::1, no spoofeable) en vez de confiar en el header Host |

## Checklist — Hallazgos "Media" (20) — TODOS RESUELTOS (19 arreglados, 1 refutado: M12)

Verificados con el mismo proceso de agentes de lectura que los "Alta". Ninguno
refutado en este bloque (el único refutado de todo el lote de 42 es B7, más abajo).

| # | Archivo | Resumen en criollo | Estado |
|---|---|---|---|
| M1 | `core/logger.js` | Un crash real se loguea como error común; un fallo ya controlado se marca "crítico" (al revés) | ✅ **HECHO** — ahora `core.boundary.excepcion_capturada` (crash real) rutea a `error:uncaught`, no `core.dominio.fallo_montaje` (aislado, no crítico) |
| M2 | `core/guard-suscripcion.js` (`GET /api/config`) | Cualquiera en la WiFi puede leer los nombres de usuario admin sin login | ✅ **HECHO** — nuevo `features/configuracion/safe-config.js`, aplicado en 4 puntos de exposición (incluyó uno extra que el reporte no listaba: el tool MCP `set_config`) |
| M3 | `core/event-bus.js` | Errores async de cualquier módulo se pierden como "genéricos" sin decir de dónde vinieron | ✅ **HECHO** — atrapa también rechazos de listeners async + fix puntual en `sonido/index.js#bot:comando` |
| M4 | `features/canales/twitch/fetch-twitch-profile.js` | Avatar/seguidores de Twitch dejan de cargar tras ~4h de sesión | ✅ **HECHO** — usa `ensureTwitchAccessToken` en vez del token crudo |
| M5 | `features/canales/twitch/oauth/auth-tokens-store.js` | Guardado del token de Twitch sin protección ante crash | ✅ **HECHO** — nuevo `core/atomic-write.js` (reutilizable para los otros 6 casos del patrón sistémico) |
| M6 | `features/canales/routes/obs-connect.js` | Doble click en "Conectar OBS" puede crear conexión fantasma | ✅ **HECHO** — lock `state.obs.connecting` + clave i18n nueva en los 10 idiomas |
| M7 | `features/chat/clean-name.js` | Un glitch de TikTok puede borrar un mensaje del chat en silencio | ✅ **HECHO** — `String(str || '')` en vez del default que solo cubre `undefined` |
| M8 | `features/moderacion/routes/viewers.js` | `?sort=__proto__` tira la vista de Moderación con error 500 | ✅ **HECHO** — arreglado en la raíz (`store/list.js`, `hasOwnProperty`), cubre cualquier caller |
| M9 | `features/moderacion/filters/blocked-words-file.js` | Guardado de palabras bloqueadas sin protección ante crash | ✅ **HECHO** — reusa `core/atomic-write.js` |
| M10 | `features/moderacion/filters/moderation-stage.js` | Palabras bloqueadas se esquivan fácil con leetspeak (`p1t0`) | ✅ **HECHO** — nueva `leetify()` (preserva espacios, a diferencia de `normalizeAggressive`) — verificado a mano con caso multi-palabra |
| M11 | `features/sonido/soundpad/save-sounds.js` (tmp+rename) | Guardado del soundpad sin protección ante crash | ✅ **HECHO** — `atomicWriteFileSync` + `load-sounds.js` respalda archivo corrupto en vez de descartarlo |
| M12 | `features/sonido/soundpad/routes/patch.js` (+delete/upload) | Panel móvil + UI principal casi simultáneos pueden perder un cambio del soundpad | ❌ **REFUTADO** — los handlers son 100% síncronos (fs.*Sync, sin await entre leer y guardar); Node.js no puede intercalar dos requests en ese tramo, la carrera descrita no es posible en este código |
| M13 | `features/sonido/musica/engine/tree-kill.js` (manejo errores) | Si falla matar yt-dlp, no queda rastro en logs | ✅ **HECHO** — listener `close` inspecciona exit code, loguea y cae a `child.kill()` si taskkill falla |
| M14 | `features/sonido/musica/handle-request.js` (userId null) | Espectadores sin ID estable comparten cuenta interna sin querer | ✅ **HECHO** — fallback `identityKey` por nick cuando no hay userId |
| M15 | `features/overlay/state/overlay-state.js` | Datos de overlay (likers, regalos, shares) se acumulan en memoria sin límite | ✅ **HECHO** — `pushBounded` (cap 500) en los 4 arrays + purga de `topLikers` por menor cantidad de likes |
| M16 | `features/reporte-bug/discord/post-webhook.js` | Reportar un bug con logs grandes es más lento de lo necesario | ✅ **HECHO** — prueba primero el último tamaño conocido-bueno |
| M17 | `features/auth/routes.js` (cancel/resume) | Cancelar/reanudar suscripción no avisa al panel móvil hasta 10 min después | ✅ **HECHO** — `refresh.emitirCambio` agregado, mismo patrón que login/logout |
| M18 | `features/auth/session-store.js` | Guardado de sesión de cuenta sin protección ante crash | ✅ **HECHO** — `atomicWriteFileSync` |
| M19 | `features/movil/routes/command.js` | Comandos del panel móvil no validan bien sus datos | ✅ **HECHO** — `esPayloadValido()`, verificado contra el cliente móvil real (manda number, no string) |
| M20 | `core/app.js` (`GET /mcp`) | Ruta de info del panel MCP sin el mismo chequeo "solo-localhost" que las mutaciones | ✅ **HECHO** — chequeo de host aplicado a todos los métodos cuando no hay MCP_TOKEN |

## Checklist — Hallazgos "Baja" (22) — VERIFICADOS (21/22 confirmados, B7 refutado)

| # | Archivo | Resumen en criollo | Estado |
|---|---|---|---|
| B1 | `core/security/is-private-ip.js` | No reconoce IPv6 de red local — móvil con IPv6 no conecta | ✅ **HECHO** — agregado ULA (fc/fd) + link-local (fe80::/10), verificado a mano |
| B2 | `electron-shell/install-marker.js` | Marca de "instalado" sin protección ante crash | ✅ **HECHO** — `atomicWriteFileSync` |
| B3 | `electron-shell/ipc-bridge.js` (dead code) | Función "olvidar atajos TTS" no la usa nadie | ✅ **HECHO** — invocada en `main.js#will-quit` |
| B4 | `features/canales/twitch/oauth/disconnect.js` | Fallo al desconectar Twitch no deja log | ✅ **HECHO** — logueado con `logger.log('warn', ...)` |
| B5 | `features/canales/kick/stale-watchdog.js` (+youtube) | Timer sin `.unref()` — el proceso tarda de más en cerrar sin Electron | ✅ **HECHO** — `.unref()` agregado en ambos archivos |
| B6 | `features/canales/gate-multi-canal.js` | Error de "necesitás Pro" en vez del error real por campo faltante | ✅ **HECHO** — default a 'tiktok' solo en `/api/connect`, confirmado que `req.path` es seguro (sin sub-router) |
| B7 | `features/canales/connect-impl.js` | Canal inválido da error 500 genérico en vez de 400 claro | ❌ **REFUTADO** — el código actual ya tiene `statusCode = 400` en ambos throws de validación; no es un bug |
| B8 | `features/moderacion/store/key-for.js` | Espectadores sin nombre/ID comparten registro (moderar a uno afecta a otros) | ❌ **REFUTADO tras investigación a fondo** — el caso "ambos vacíos" no es alcanzable en ningún camino real (chat, rutas de moderación, MCP, follows); hay un test que documenta el fallback "anon" como comportamiento esperado a propósito |
| B9 | `features/moderacion/store/ensure.js` | Campos `msgs/gifts/likes` nunca se usan — bytes muertos | ✅ **HECHO** — eliminados de los 4 archivos que los referenciaban, verificado que el frontend no los usa |
| B10 | `features/moderacion/store/mark-follower.js` | Parámetro sin uso real, riesgo de desalineación futura | ✅ **HECHO** — parámetro `manual` eliminado (código muerto) |
| B11 | `features/moderacion/filters/normalize-aggressive.js` | El "7" no se normaliza a "t" en el filtro anti-leetspeak (bug de regex) | ✅ **HECHO** — `7` agregado al regex, arregla también `leetify()` (M10) |
| B12 | `features/moderacion/routes/follower.js` | Mandar `"false"` (string) marca como seguidor en vez de desmarcar | ✅ **HECHO** — chequeo estricto `=== true`, verificado contra el frontend real |
| B13 | `features/sonido/soundpad/save-sounds.js` (try/catch) | Guardado sin try/catch — error genérico sin pista | ✅ **HECHO** — try/catch + logger opcional, mismo patrón que `load-sounds.js` |
| B14 | `features/sonido/musica/engine/tree-kill.js` (TOCTOU pid) | Caso muy puntual: podría matar el proceso equivocado | ✅ **HECHO** — guard `exitCode`/`signalCode` antes de matar por PID |
| B15 | `features/sonido/musica/engine/tree-kill.js` (no-Windows) | Solo afecta dev en Linux/Mac, no el instalador real | ✅ **HECHO** — `detached` + matar grupo de procesos en no-Windows, con fallback |
| B16 | `features/sonido/musica/handle-request.js` (leak) | Lista de "última vez que pidió canción" crece sin límite | ✅ **HECHO** — poda LRU por cantidad (500→400) |
| B17 | `features/overlay/state/follower-refresh-timer.js` | Contador de seguidores se reinicia de más con reconexiones frecuentes | ✅ **HECHO** — `startFollowerRefresh` ahora es idempotente |
| B18 | `features/overlay/routes/test-gift.js` | "Probar regalo" a veces muestra ícono roto | 🔎 **CONFIRMADO** — pendiente de arreglar |
| B19 | `features/overlay/routes/upload-bg.js` | Subir fondos sin borrar los anteriores llena la carpeta de uploads | 🔎 **CONFIRMADO** — pendiente de arreglar |
| B20 | `features/configuracion/platform-config-store.js` | Client ID de Twitch sin protección ante crash | ✅ **HECHO** — `atomicWriteFileSync` |
| B21 | `features/reporte-bug/read-file-tail.js` | Comentario referencia un archivo que ya no existe (solo confunde) | ✅ **HECHO** — comentario corregido |
| B22 | `features/telemetria/buffer.js` + `creator-cache.js` | Guardado de telemetría sin protección ante crash (impacto mínimo) | ✅ **HECHO** — `atomicWriteFileSync` en ambos |

## Hallazgos de ultrareview — YA ARREGLADOS

De `/ultrareview` sobre el diff `main..Dev-2-nuevo-backend` (partido en PR #39 y #40):

- ✅ `features/promo/index.js` — gate `sin-promos` invertido (silenciaba avisos para TODOS por defecto)
- ✅ `features/telemetria/connectors/platforms.js` — `sin-canales` de TikTok borraba el registro de Twitch/YouTube también
- ✅ `interfaz/src/vistas/principal/index.js` + `cliente-ws.js` — loaders (voces/soundpad/música/OAuth) no se re-pedían tras el login
- ✅ `features/auth/refresh.js` — `emitirCambio` no comparaba `entitlements`
- ✅ `core/guard-suscripcion.js` — rutas OAuth de Twitch se saltaban el muro de login + cacheo de `subscriptionsEnabled`
- ✅ `features/promo/index.js` — nit: usa `getConfigSnapshot` en vez de duplicar el patrón
- ✅ `electron-shell/glitchtip.js` — nit: `chat.mensaje.duplicado` agregado a `RUIDO_BREADCRUMB`
- ✅ `features/canales/tiktok/connect-tiktok-channel.js` — nit: `if (entryRef)` muerto eliminado

## Si te quedaste sin contexto / sos otra IA retomando esto

1. Leé este archivo entero primero.
2. Corré `npm test` para confirmar el baseline (142 pass antes de seguir; si hay un
   número distinto, alguien avanzó sin actualizar este archivo — revisá `git diff`
   y `git log` para ver qué se aplicó).
3. Preguntale al usuario (liber) por dónde quiere seguir — no asumas que hay que
   seguir el orden de la tabla. Explicale cada hallazgo pendiente EN CRIOLLO antes
   de tocar código, y esperá confirmación explícita.
4. Por cada hallazgo que el usuario apruebe: lanzá un subagente nuevo (no vos
   directamente) dedicado solo a ESE hallazgo, con el resumen de esta tabla + el
   detalle completo del reporte original (`AUDITORIA_BACKEND_TIKLIVETTS_2026-09-11.md`)
   como contexto, instrucción de usar criterio `/ponytail`, correr `npm test`, y NO
   commitear.
5. Actualizá este archivo (cambiar ⬜/🔧 por ✅ en la fila correspondiente) apenas el
   subagente confirme el fix y los tests pasen — así el checklist queda siempre al día.
6. Los PRs #39 y #40 en GitHub son de solo comparación (no mergear) — se pueden
   cerrar sin mergear cuando termine todo este checklist. `review-chunk-1` es un
   branch temporal, se puede borrar (`git branch -d review-chunk-1` local +
   `git push origin --delete review-chunk-1`) una vez cerrados ambos PRs.
