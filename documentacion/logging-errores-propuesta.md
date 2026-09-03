# Especificación de logging y errores por dominio y función

Base: auditoría completa de `log()`, `console.*`, `telemetryBus.emit()` y `catch` en server.js/main.js/moderation-store.js/music-engine.js/telemetry/ (ver problemas exactos citados en cada sección con file:line actual). Objetivo: cada función tiene una lista cerrada de eventos posibles, cada evento con nombre máquina-legible, nivel, y campos de datos OBLIGATORIOS — para que cualquier IA/humano lea un log y entienda el suceso sin ambigüedad ni tener que ir a leer el código.

## Esquema estándar de evento (obligatorio para todo dominio nuevo)

```json
{
  "ts": "ISO-8601",
  "level": "debug|info|warn|error|fatal",
  "domain": "chat|overlay|clips|sonido|movil|bot|moderacion|configuracion|donar|canales|avanzado|reporte-bug|idioma|core",
  "function": "nombre-archivo-función exacto, ej: chat/emit-chat-message.js#emitChatMessage",
  "event": "dominio.entidad.estado — snake/kebab, ej: canales.tiktok.reconexion_fallida",
  "message": "frase en español, SIEMPRE con los identificadores clave interpolados, nunca genérica",
  "data": { "...": "campos obligatorios listados por evento abajo" },
  "correlationId": "id de mensaje/petición cuando aplica (msgId, requestId, channelKey)",
  "stack": "SOLO en level=error|fatal, siempre presente, nunca opcional"
}
```

Reglas duras (fixean los patrones imprecisos encontrados hoy):
1. **Ningún evento `level=error` se emite sin `stack`.** Hoy `error:handled` llega casi siempre con `stack:null` porque los call-sites de `log('error',...)` no pasan `data.stack` (server.js:1005 depende de que el caller lo incluya, y casi ninguno lo hace). En la reconstrucción, `core/logger.js` EXTRAE el stack automáticamente si `data` es o contiene un `Error`, así el caller no puede olvidarlo.
2. **Todo log de canal/usuario incluye su identificador**, aunque esté disponible en scope y "obvio" para quien escribió el código. Fixea casos hoy rotos: reconexión TikTok sin `username` (server.js:1701), `connect` fallido sin `cleanUsername` (server.js:1756), `Reconectando...` de Twitch/YouTube sin `channel` (server.js:2721, 2890), `YouTube chat error` sin `channel` (server.js:2879), `Error al conectar`/`Error al agregar canal` sin `channel` (server.js:2949, 3119), mensaje descartado por ban sin `userId`/`nick` (server.js:1497), `cola llena` sin datos (server.js:844).
3. **Ningún `catch` queda mudo.** Todo catch, aunque sea "best-effort" (ej. `conn.disconnect()` en shutdown), emite mínimo `level=debug` con `event` explícito de tipo `*.limpieza_ignorada`. Fixea: parseo WS entrante inválido (server.js:1737), fallo escribiendo stream de log de sesión (server.js:161, 1017 — el más grave, porque si esto falla ningún log posterior de la sesión llega al archivo que se adjunta en reportes de bug), fallo leyendo perfil Twitch (server.js:2792), fallo poll de Twitch OAuth (server.js:3432), fallo borrando archivo de soundpad (server.js:3800), fallo matando proceso hijo de música (server.js:3909).
4. **Ningún `console.*` suelto.** Todo pasa por `core/logger.js`. Fixea: server.js:3229 (parse error OBS ws), server.js:4062/4064 (puerto ocupado/listen error — HOY UN FALLO FATAL DE ARRANQUE NO QUEDA REGISTRADO EN NINGÚN LADO), main.js:119, 312, 469, 547, 584 (uiohook fallback, tray failed, updater notify, atajo inválido, atajo TTS), telemetry/index.js:90, 99.
5. **No se loguea el objeto config completo.** Fixea server.js:701 y 2153 (loguean `config` entero incluyendo `adminIdentities` — lista de usernames admin — en texto plano al archivo de sesión). Nuevo evento `configuracion.config.actualizado` incluye SOLO `{keysChanged: string[]}`, nunca valores sensibles.
6. **Todo evento de error de red/servidor externo (Google TTS, Twitch API, Discord webhook, ingest de telemetría) loguea código HTTP + cuerpo/mensaje**, nunca solo "falló". Fixea transport.js (el punto más ciego: fallo de envío de telemetría 100% silencioso hoy) y los 4xx tratados como éxito silencioso (transport.js:66).
7. **Rate-limit y NO-op explícitos son `info`, nunca invisibles.** Ej: "motor de música deshabilitado" hoy no dice ni query ni user (server.js:813).
8. **Todo `throw`/`catch` en una ruta HTTP loguea ANTES de responder**, nunca solo `res.status(...).json(...)`. Fixea 8 endpoints que hoy responden error al cliente sin dejar rastro server-side: `/api/blocked-words/export`, `/api/upload-bg` DELETE, `/api/test/gift`, `/api/platforms/disconnect`, `/api/channels/remove`, `/api/obs/connect`, `/api/obs/save-replay`, `/api/mobile/qr`.
9. **Un dominio caído nunca oscurece a otro.** Cada evento de error se etiqueta con `domain` real de origen (fixea server.js:2949/3119 que usan `platform` genérico como ctx en vez del dominio `canales` + subcontexto).

---

## /core

### core/logger.js — log(level, domain, function, event, message, data)
- `core.logger.escritura_fallida` (error) — stream de archivo de sesión no pudo escribirse. data: `{path, error, bytesPerdidos}`. **Nunca silencioso** (fix del bug más grave encontrado: hoy esto se traga con `catch(_){}` en server.js:161/1017).
- `core.logger.buffer_lleno` (warn) — `serverLogs` en memoria alcanzó el cap (250) y empezó a descartar entradas viejas. data: `{cap, descartados}`.

### core/http-server.js — start(port)
- `core.http.iniciado` (info) — data: `{port, pid}`
- `core.http.puerto_en_uso` (fatal) — data: `{port, error}` — fixea server.js:4062 (hoy `console.error` suelto, invisible)
- `core.http.error_listen` (fatal) — data: `{port, error, stack}` — fixea server.js:4064

### core/ws-server.js — onConnection / onMessage
- `core.ws.cliente_conectado` (info) — data: `{clientId, ip, esDesktop, totalClientes}`
- `core.ws.cliente_desconectado` (info) — data: `{clientId, totalClientes}`
- `core.ws.mensaje_invalido` (debug) — mensaje entrante no parseable como JSON. data: `{clientId, rawPreview: primeros 200 chars}` — fixea server.js:1737 (hoy silencioso)
- `core.ws.origen_rechazado` (warn) — conexión rechazada por origen/host no local. data: `{ip, hostHeader, origin}` — fixea server.js:239 (hoy responde 403 sin loguear qué origen se rechazó)

### core/register-domain.js — registerDomain(domainIndex)
- `core.dominio.montado` (info) — data: `{domain, rutas: number, listeners: number}`
- `core.dominio.fallo_montaje` (fatal para ESE dominio, no para el proceso) — data: `{domain, error, stack}` — el resto de dominios sigue vivo; este evento es la garantía observable de aislamiento de fallos.

### core/error-boundary.js — wrap(handler)
- `core.boundary.excepcion_capturada` (error) — data: `{domain, function, route|event, error, stack}` — todo handler roto pasa por aquí antes de responder 500 genérico al cliente.

### core/event-bus.js — emit/on
- `core.bus.listener_fallido` (error) — un listener de un evento lanzó excepción; no debe tumbar a los demás listeners. data: `{event, domainListener, error, stack}`.

---

## /configuracion

### apply-patch.js — applyConfigPatch(input)
- `configuracion.patch.aplicado` (info) — data: `{keysChanged: string[]}` — NUNCA el objeto config completo (fix regla 5)
- `configuracion.patch.rechazado` (warn) — data: `{rejected: string[]}` — validación falló para esas claves. fixea 400 `'Config invalida'` (server.js:2147) que hoy no deja log server-side separado del response.

### store.js — saveConfig/loadConfig
- `configuracion.store.guardado` (info) — data: `{path}`
- `configuracion.store.guardado_fallido` (error) — data: `{path, error, stack}` — fixea server.js:691 (hoy sin stack)
- `configuracion.store.cargado` (info) — data: `{keysCount}` — nunca el config completo (fix server.js:701)
- `configuracion.store.claves_invalidas_ignoradas` (warn) — data: `{rejected: string[]}`
- `configuracion.store.carga_fallida` (warn) — data: `{path, error}` — usa DEFAULT_CONFIG como fallback

### platform-config-store.js — savePlatformConfig/loadPlatformConfig
- `configuracion.platform.guardado_fallido` (error) — data: `{error, stack}`
- `configuracion.platform.carga_fallida` (warn) — data: `{error}`

---

## /idioma

### message-matches-voice-script.js
- `idioma.script.evaluado` (debug, solo si config.debugLog activo) — data: `{voiceId, coincide: boolean}` — no loguear el texto del mensaje (privacidad)

### message-matches-dict-lang.js
- `idioma.dict.evaluado` (debug) — data: `{voiceId, coincide: boolean}`

### lang-dicts.js — getLangDicts()
- `idioma.dict.cargado` (info) — data: `{lang, palabras: number}`
- `idioma.dict.carga_fallida` (warn) — data: `{lang, path, error}` — fixea server.js:1284 (ya tenía log, se mantiene el patrón)

---

## /moderacion

### store/flush.js
- `moderacion.store.guardado` (debug) — data: `{viewers: number}`
- `moderacion.store.guardado_fallido` (error) — data: `{path, error, stack}` — fixea server.js:125 (ya logueaba, ahora exige stack)

### store/backup-and-reset.js
- `moderacion.store.apartado_por_corrupcion` (error) — data: `{reason, suffix, pathNuevo}`
- `moderacion.store.backup_fallido` (fatal) — doble fallo: ni el store ni su backup se pudieron escribir. data: `{error, stack}`

### store/load.js
- `moderacion.store.cargado` (info) — data: `{viewers: number}`
- `moderacion.store.lectura_fallida` (warn) — data: `{path, error}`

### store/purge.js
- `moderacion.store.limite_alcanzado` (warn) — data: `{viewers, disposable, limite}` — no había suficientes candidatos descartables
- `moderacion.store.purgado` (info) — data: `{removed, viewersRestantes}`

### store/sweep-expired.js
- `moderacion.store.castigos_expirados` (info) — data: `{mutesLimpiados, bansLimpiados}` — hoy no existe evento propio para este barrido periódico

### filters/is-spam.js / moderation-stage.js
- `moderacion.filtro.mensaje_bloqueado` (info) — data: `{platform, userId, nick, key, motivo: 'longitud'|'char-repetido'|'palabra-bloqueada'|'script'|'dict'|'duplicado'|'user-banned'|'user-muted'}` — fixea server.js:1409/1415/1497/1505 que hoy solo mandan `{reason}` sin identificar AL USUARIO (el problema más citado por el usuario: "no ayudan a diagnosticar")
- `moderacion.filtro.palabra_bloqueada` (info) — data: `{platform, userId, nick, palabra}` — fixea server.js:1410 (hoy sin payload)

### policy.js — evaluate(msg)
- `moderacion.policy.evaluado` (debug) — data: `{platform, userId, isSpam, isMuted, isBanned, isFollower}`
- `moderacion.policy.fallo_evaluacion` (error, fail-open documentado) — data: `{platform, userId, error, stack}` — el mensaje se trata como permitido; este evento es la única forma de saber que el fail-open se activó.

### routes/mute.js, ban.js, unmute.js, unban.js, clear.js, follower.js
- `moderacion.accion.mute_aplicado` (info) — data: `{key, platform, userId, nick, until, permanente: boolean, admin: false}`
- `moderacion.accion.ban_aplicado` (info) — mismos campos
- `moderacion.accion.unmute_aplicado` / `unban_aplicado` (info) — data: `{key}`
- `moderacion.accion.target_admin_rechazado` (warn) — data: `{key}` — fixea el 403 (server.js:2205) sin log server-side
- `moderacion.accion.duracion_invalida` (warn) — data: `{durationMsRecibido}`
- `moderacion.accion.registro_vaciado` (info) — data: `{removed}`

### filters/blocked-words-file.js
- `moderacion.palabras.cargado` (info) — data: `{count}`
- `moderacion.palabras.carga_fallida` (error) — data: `{path, error, stack}`
- `moderacion.palabras.guardado` (info) — data: `{count}`
- `moderacion.palabras.guardado_fallido` (error) — data: `{path, error, stack}`
- `moderacion.palabras.export_fallido` (error) — data: `{error, stack}` — fixea server.js:2287 (hoy solo responde HTTP)

---

## /canales

### tiktok/connect-tiktok-channel.js
- `canales.tiktok.conectando` (info) — data: `{channel}`
- `canales.tiktok.conectado` (info) — data: `{channel, totalCanalesTiktok}`
- `canales.tiktok.conexion_fallida` (error) — data: `{channel, error, stack}` — fixea server.js:1756 (hoy sin `cleanUsername`/`channel`)
- `canales.tiktok.timeout_conexion` (warn) — data: `{channel, timeoutMs: 30000}` — fixea server.js:3040 (ya tenía channel, se mantiene)

### tiktok/reconnect-tiktok.js
- `canales.tiktok.reconectando` (warn) — data: `{channel, intento, delayMs}` — fixea server.js:1666 (hoy interpola en el string en vez de `data`)
- `canales.tiktok.reconexion_exitosa` (info) — data: `{channel, intentosUsados}`
- `canales.tiktok.reconexion_fallida` (error) — data: `{channel, intentosAgotados, error, stack}` — fixea server.js:1701 (hoy sin `channel`) y la asimetría con server.js:1707-1712 que hoy no emite el evento equivalente de telemetría `platform:reconnect-failed`

### twitch/connect-twitch.js
- `canales.twitch.conectando` (info) — data: `{channel}`
- `canales.twitch.conectado` (info) — data: `{channel, autenticado: boolean, totalCanalesTwitch}`
- `canales.twitch.reconectando` (warn) — data: `{channel, intento, delayMs}` — fixea server.js:2721 (hoy sin `channel`)
- `canales.twitch.reconexion_fallida` (error) — data: `{channel, error, stack}`

### twitch/fetch-twitch-profile.js
- `canales.twitch.perfil_obtenido` (debug) — data: `{login}`
- `canales.twitch.perfil_fallido` (warn) — data: `{login, statusHttp, error}` — fixea server.js:2792 (hoy `catch(_)` silencioso, imposible diagnosticar por qué un canal nunca muestra avatar/seguidores)

### youtube/connect-youtube.js
- `canales.youtube.conectando` (info) — data: `{channelOrId}`
- `canales.youtube.conectado` (info) — data: `{channelOrId, totalCanalesYoutube}`
- `canales.youtube.error_chat` (error) — data: `{channel, error, stack}` — fixea server.js:2879 (hoy sin `channel` y `String(err)` puede perder el stack)
- `canales.youtube.reconectando` (warn) — data: `{channel, intento, delayMs}` — fixea server.js:2890 (hoy sin `channel`)

### rate-limit.js — connectRateLimiter
- `canales.rate_limit.bloqueado` (warn) — data: `{ip, endpoint}` — hoy solo responde 429 sin loguear IP/endpoint

### obs/connect.js
- `canales.obs.conectado` (info) — data: `{host, port}` — fixea telemetryBus 'obs:connected' que hoy no lleva payload
- `canales.obs.conexion_fallida` (error) — data: `{host, port, error, stack}` — fixea server.js:3290 (hoy solo HTTP)
- `canales.obs.reconectando` (warn) — data: `{intento, delayMs}`
- `canales.obs.reconexion_agotada` (error) — data: `{intentos}`
- `canales.obs.mensaje_no_parseable` (debug) — data: `{rawPreview}` — fixea server.js:3229 (hoy `console.warn` suelto)

### obs/save-replay.js
- `canales.obs.replay_guardado` (info) — data: `{}` — fixea telemetryBus 'obs:clip-saved' sin payload hoy
- `canales.obs.replay_fallido` (error) — data: `{error, stack}` — fixea server.js:3317 (hoy solo HTTP)
- `canales.obs.no_conectado` (warn) — intento de guardar replay sin conexión activa

### twitch/oauth/poll-device-token.js
- `canales.twitch_oauth.device_code_emitido` (info) — data: `{userCodeMascarado}` — nunca loguear el code completo en texto plano si se comparte log
- `canales.twitch_oauth.poll_error` (warn) — data: `{error, statusHttp}` — fixea server.js:3432 (hoy `catch(_)` totalmente silencioso)
- `canales.twitch_oauth.device_code_expirado` (warn) — data: `{}`
- `canales.twitch_oauth.autorizado` (info) — data: `{login}`
- `canales.twitch_oauth.token_refrescado` (info) — data: `{}`
- `canales.twitch_oauth.token_refresh_fallido` (error) — data: `{error, stack}`

### twitch/eventsub/connect-socket.js
- `canales.twitch_eventsub.suscripcion_activa` (info) — data: `{tipo: 'channel.follow'}`
- `canales.twitch_eventsub.ws_error` (warn) — data: `{error}`
- `canales.twitch_eventsub.mensaje_no_parseable` (debug) — data: `{rawPreview}` — fixea server.js:3586 (hoy silencioso)
- `canales.twitch_eventsub.keepalive_perdido` (warn) — data: `{ultimoKeepaliveMs}` — fixea server.js:3577 (hoy sin datos)
- `canales.twitch_eventsub.suscripcion_revocada` (warn) — data: `{reason}`
- `canales.twitch_eventsub.follow_recibido` (info) — data: `{user}`

---

## /chat

### emit-chat-message.js — emitChatMessage
- `chat.mensaje.emitido` (debug) — data: `{platform, userId, nick, msgId}` — nunca el texto (privacidad), sí el identificador para correlacionar con moderación/TTS
- `chat.mensaje.bloqueado` (info) — data: `{platform, userId, nick, motivo}` — reemplaza el hoy-genérico `moderation:message-filtered {reason}`
- `chat.policy_fallo_evaluacion` (error) — se recibió fail-open de /moderacion. data: `{platform, userId, error, stack}`

### resolve-display-name.js / clean-name.js
- `chat.nombre.normalizado` (debug, solo si difiere del original) — data: `{original, normalizado}`
- `chat.nombre.auto_generado_detectado` (debug) — data: `{nombre}`

### routes/test-chat.js
- `chat.test.inyectado` (info) — data: `{platform, user}`

---

## /overlay

### state/recompute-follower-base.js
- `overlay.followers.base_recalculada` (info) — data: `{totalCanales, sumaBase}`

### state/follower-refresh-timer.js
- `overlay.followers.refrescado` (info) — data: `{channel, count}` — fixea server.js:1057 (ya tenía datos, se mantiene)
- `overlay.followers.refresco_fallido` (warn) — data: `{channel, error, stack}` — fixea server.js:1066 (agrega stack)

### compute-gift-usd.js
- `overlay.gift.valorado` (debug) — data: `{giftName, repeatCount, diamondCount, usd}`
- `overlay.gift.valor_desconocido` (warn) — regalo sin mapping en TIKTOK_GIFT_COINS. data: `{giftName, diamondCount}` — hoy no existe este evento, el regalo se valora en 0 o se ignora sin aviso

### routes/upload-bg.js
- `overlay.fondo.subido` (info) — data: `{url, sizeBytes}`
- `overlay.fondo.borrado` (info) — data: `{filename}`
- `overlay.fondo.borrado_fallido` (error) — data: `{filename, error, stack}` — fixea server.js:2386 (hoy solo HTTP)

### routes/test-*.js (gift/follow/share/sub/cheer/raid/likes)
- `overlay.test.disparado` (info) — data: `{tipo, payload}` — unifica los 7 eventos hoy sueltos con formato distinto cada uno

---

## /sonido

### tts/routes/generate.js
- `sonido.tts.solicitado` (info) — data: `{voice, textLen}` — fixea server.js:1813 (mantiene la privacidad del texto)
- `sonido.tts.rate_limitado` (warn) — data: `{voice, retryAfterMs}`
- `sonido.tts.hablado` (info) — data: `{voice, slow: boolean}`
- `sonido.tts.error_google_http` (error) — data: `{status, contentType, errorBodyPreview, stack}`
- `sonido.tts.error_google_timeout` (error) — data: `{voice, textLen, timeoutMs: 15000, stack}`
- `sonido.tts.error_google_red` (error) — data: `{voice, error, stack}`

### musica/handle-request.js — handleMusicRequest
- `sonido.musica.solicitud_recibida` (info) — data: `{platform, user, query}` — hoy server.js:812 ya loguea esto local pero contradice el comentario de "no incluir query/user" que solo aplica al evento de telemetría separado; se documenta explícitamente que el LOG local sí lleva estos datos (por diseño, para moderación/soporte) y el evento de TELEMETRÍA remota (`music:request`) NUNCA los lleva (solo `{platform}`)
- `sonido.musica.deshabilitada` (info) — data: `{platform, user, query}` — fixea server.js:813 (hoy sin ningún dato)
- `sonido.musica.comando_duplicado` (info) — data: `{user, query}`
- `sonido.musica.usuario_baneado` (info) — data: `{user, platform, query}` — fixea server.js:839 (hoy sin platform/query)
- `sonido.musica.cooldown_activo` (info) — data: `{user, cooldownRestanteMs}`
- `sonido.musica.cola_llena` (warn) — data: `{user, platform, colaActual, colaMaxima}` — fixea server.js:844 (hoy CERO datos, el caso más citado como "genérico" por el usuario)
- `sonido.musica.motor_no_disponible` (error) — data: `{query, error, stack}`
- `sonido.musica.track_resuelto` (info) — data: `{query, videoId, titulo, duracionSeg}`
- `sonido.musica.track_no_encontrado` (warn) — data: `{query}`
- `sonido.musica.stream_error` (warn) — data: `{videoId, exitCode, stderrTail}`

### soundpad/routes/upload.js
- `sonido.soundpad.subido` (info) — data: `{id, nombre, sizeBytes}`
- `sonido.soundpad.limite_alcanzado` (warn) — data: `{maximo: 24}`
- `sonido.soundpad.borrado_archivo_fallido` (warn) — data: `{id, path, error}` — fixea server.js:3800 (hoy silencioso)

---

## /movil

### validate-request.js
- `movil.acceso.rechazado` (warn) — data: `{ip, motivo: 'no-privada'|'host-no-local'}` — fixea server.js:254 (hoy solo HTTP 400)
- `movil.emparejado` (info) — data: `{ip}` — una vez por sesión, fixea telemetryBus 'mobile:paired' sin payload hoy

### routes/command.js
- `movil.comando.recibido` (info) — data: `{accion, origen: 'mobile'}`
- `movil.comando.no_valido` (warn) — data: `{accionRecibida}` — fixea server.js 400 'Acción no válida' sin log
- `movil.comando.sin_desktop` (warn) — comando requiere cliente desktop y no hay ninguno conectado. data: `{accion}`

### routes/qr.js
- `movil.qr.generado` (debug) — data: `{}`
- `movil.qr.generacion_fallida` (error) — data: `{error, stack}` — fixea server.js:3720 (hoy solo HTTP)

---

## /bot

### parse-command.js
- `bot.comando.detectado` (debug) — data: `{comando, platform, user}`
- `bot.comando.no_reconocido` (debug, solo si config.debugLog) — data: `{textoPreview}`

---

## /clips

### mark-clip.js
- `clips.marcado.solicitado` (info) — data: `{origen: 'atajo-teclado'|'mobile'}`
- `clips.marcado.exitoso` (info) — data: `{}`
- `clips.marcado.fallido` (error) — data: `{error, stack}` — se propaga desde `canales.obs.replay_fallido`, pero clips agrega su propio evento porque el usuario percibe el fallo desde el atajo, no desde OBS

---

## /avanzado

### feature-flags.js
- `avanzado.feature_flag.evaluado` (debug) — data: `{flag, valor}`

### accesibilidad.js
- `avanzado.a11y.actualizado` (info) — data: `{campo, valor}` — nunca loguear todo el bloque de config (fix regla 5)

---

## /reporte-bug

### webhook-url.js
- `reporte_bug.webhook.no_configurado` (warn) — data: `{motivo: 'archivo-inexistente'|'json-corrupto'|'url-vacia'}` — fixea server.js:2108 (hoy sin decir POR QUÉ falta, uno de los casos más citados por el usuario como "dato a medias")

### discord/post-webhook.js
- `reporte_bug.discord.enviado` (info) — data: `{discordNick, channelLink, attached: boolean, attachedBytes}`
- `reporte_bug.discord.intento_fallido` (warn) — data: `{intentoNumero, capBytesIntentado, statusHttp, error}` — fixea server.js:2076 (hoy la escalera de intentos no loguea cada intento intermedio, solo el resultado final)
- `reporte_bug.discord.envio_fallido` (error) — data: `{error, stack}`

### error-listeners.js
- `reporte_bug.error_uncaught.capturado` (fatal) — data: `{where, message, stack}` — el proceso SIGUE VIVO tras esto (documentado como decisión explícita, no accidente); fixea que hoy `uncaughtException`/`unhandledRejection` no terminan el proceso sin que quede constancia de esa decisión
- `reporte_bug.error_handled.recibido` (debug) — data: `{domain, function, event}` — traza de que el pipeline de error-boundary → telemetría está vivo
- `reporte_bug.limite_sesion_alcanzado` (warn) — data: `{max: 50}` — fixea telemetry/connectors/errors.js (hoy descarta el evento 51 en adelante sin ningún aviso)

---

## /telemetria (transversal)

### transport.js — send(events)
- `telemetria.envio.exitoso` (debug) — data: `{eventsCount, statusHttp}`
- `telemetria.envio.rechazado` (warn) — data: `{statusHttp, bodyPreview}` — fixea transport.js:66 (hoy 4xx = éxito silencioso, imposible saber si el token de ingest expiró)
- `telemetria.envio.fallido` (error) — data: `{intentoNumero, retriesTotal, error, stack}` — fixea el catch más ciego del sistema (transport.js:75-82, hoy CERO logs en cualquier intento, incluido el final)
- `telemetria.buffer.corrupto` (warn) — data: `{path}` — fixea buffer.js:27 (hoy se descarta sin loguear)
- `telemetria.buffer.persistencia_fallida` (warn) — data: `{path, error}` — fixea buffer.js:36 (comentario "disco lleno" sin log real)

### creator-cache.js
- `telemetria.creator_cache.corrupta` (warn) — data: `{path}`
- `telemetria.creator_cache.resolucion_fallida` (warn) — data: `{platform, username, error}` — fixea connectors/creators.js:29 (hoy silencioso, indistinguible de "resuelto sin perfil")

### index.js — init()
- `telemetria.init.fallido` (error) — data: `{error, stack}` — fixea index.js:90 (hoy `console.error` suelto)
- `telemetria.conector.enganche_fallido` (error) — data: `{connectorName, error, stack}` — fixea index.js:99

---

## /electron-shell

### uiohook.js
- `electron_shell.uiohook.fallback_globalshortcut` (warn) — data: `{error}` — fixea main.js:119 (hoy `console.warn` suelto, invisible en producción empaquetada)

### tray.js
- `electron_shell.tray.creacion_fallida` (error) — data: `{error, stack}` — fixea main.js:312 (hoy `console.error` suelto; la app cambia de comportamiento — deja de minimizar a tray — sin dejar rastro)

### updater.js
- `electron_shell.updater.notificacion_fallida` (warn) — data: `{error}` — fixea main.js:469
- `electron_shell.updater.chequeo_emergencia_fallido` (warn) — data: `{error}` — fixea main.js:341

### ipc-bridge.js — register-tts-shortcut / register-soundpad-shortcut
- `electron_shell.atajo.invalido` (warn) — data: `{shortcutSolicitado, motivo}` — fixea main.js:547 (hoy `console.error` suelto + respuesta al renderer sin registro)
- `electron_shell.atajo.registro_fallido` (error) — data: `{action, shortcut, error, stack}` — fixea main.js:584 y main.js:624 (el segundo hoy NI SIQUIERA tiene console.error, completamente mudo)

## /mcp (agregado post-rebuild)

Servidor MCP. Los eventos se emiten desde `features/mcp/` y `core/contracts/mcp-registry.js`.
`electron-shell/glitchtip.js` mapea los de nivel `error` a fingerprints `error_mcp_*`.

- `mcp.dominio.listo` (info) — data: `{tools, enabled}` — al montar el dominio.
- `mcp.tool.llamada` (info) — data: `{tool, ms}` — llamada OK. Breadcrumb + Aptabase `mcp_tool_used`.
- `mcp.tool.fallo` (warn) — data: `{tool, ms, code}` — fallo **esperado** (`unknown_tool`, `invalid_args`, un `{ok:false}` deliberado del handler). Breadcrumb, **NO** issue.
- `mcp.tool.excepcion` (error) — data: `{tool, ms, code, argsKeys, stack}` — el handler **lanzó** (bug). → issue `error_mcp_tool`, tag `mcp_tool`, context `mcp`.
- `mcp.transport.request` (debug) — data: `{method}` — un request HTTP a `/mcp`. Ruido de breadcrumb (excluido).
- `mcp.transport.error` (error) — data: `{method, error, stack}` — excepción que escapó del `StreamableHTTPServerTransport` / `server.connect`. → issue `error_mcp_transport`.
- `mcp.deshabilitado.rechazo` (info) — data: `{method}` — request a `/mcp` con `mcpEnabled=false` (respondido 503).
- `mcp.registro.tool_duplicada` (error) — data: `{name, domain}` — dos dominios registraron el mismo `name`. → `error_mcp_registro` (+ el 2º dominio no monta, aislado).
- `mcp.registro.schema_invalido` (error) — data: `{name, domain, error}` — `inputSchema` que el adapter no soporta. → `error_mcp_registro`.
- `mcp.estado.provider_fallido` (error) — data: `{domain, error}` — un `registerStateProvider` lanzó en `collectState()`. `get_state` devuelve el resto igual. → `error_mcp_estado`.

---

# Checklist de migración (por si se aplica gradualmente antes de la reconstrucción completa)

1. Reemplazar `log(level, ctx, msg, data)` por la firma nueva con `event` obligatorio — permite grep exacto por evento en vez de por texto libre.
2. Auditar cada `catch (_) {}` del inventario y decidir: ¿de verdad es best-effort silencioso (ej. shutdown) o es un punto ciego (ej. transport.js)? Marcar explícitamente los primeros con comentario `// silencioso: <razón>` y loguear TODOS los segundos.
3. Sacar `adminIdentities` de cualquier log de config completo — ya sea antes o durante la reconstrucción, es el único hallazgo de fuga de dato sensible.
4. Priorizar el fix de `core/logger.js` (stream de sesión que falla en silencio) — es el bug que invalida el resto del sistema de diagnóstico si ocurre, porque nada posterior queda registrado.
