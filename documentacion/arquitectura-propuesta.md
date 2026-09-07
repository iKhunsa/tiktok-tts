# Arquitectura propuesta — reconstrucción por dominio

## Principio rector
- Carpeta por dominio, un archivo por función. Fallo en /chat solo afecta /chat.
- Ningún dominio importa el módulo interno de otro. Toda comunicación cruzada pasa por /core (event bus + contratos tipados).
- Cada dominio expone un único `index.js` (registro) que el core monta con inyección de dependencias — nunca `require` directo entre dominios.

## /core (kernel — no es un dominio, es el sostén)
- core/app.js — crea instancia Express, monta middlewares globales (helmet-like, cors local)
- core/http-server.js — crea http.Server + arranque/cierre
- core/ws-server.js — WebSocketServer genérico, gestiona conexiones crudas (auth de origen local vía core/security/is-local-request.js)
- core/event-bus.js — EventEmitter tipado central (único canal entre dominios)
- core/register-domain.js — monta un dominio: `registerDomain({app, wss, bus, logger, config}, domainIndex)` envuelto en try/catch — si domainIndex.register lanza, se loguea y el resto de dominios sigue vivo
- core/error-boundary.js — wrapper para route handlers y listeners de bus: captura excepción, loguea, responde 500 genérico, nunca tumba el proceso
- core/logger.js — log(level,ctx,msg,data) (antes server.js:994)
- core/broadcast.js — helper para publicar a todos los WS clients (contrato: los dominios NUNCA tocan wss directo, solo bus.emit + core lo traduce a WS)
- core/security/is-local-request.js, is-private-ip.js — (antes isLocalHostname, isPrivateIP)
- core/paths.js — resolución TIKTOK_RESOURCES_PATH / userData
- core/shutdown.js — orquesta shutdown ordenado llamando `domain.shutdown()` de cada dominio registrado

## /configuracion
- config/default-config.js — DEFAULT_CONFIG
- config/validators.js — CONFIG_VALIDATORS
- config/apply-patch.js — applyConfigPatch(input)
- config/store.js — saveConfig/loadConfig (config.json)
- config/platform-config-store.js — savePlatformConfig/loadPlatformConfig
- config/routes/get-config.js — GET /api/config
- config/routes/patch-config.js — PATCH /api/config → bus.emit('config:updated', patch)
- config/routes/get-platform-config.js, patch-platform-config.js
- config/routes/get-status.js — GET /api/status
- config/logs/read-file-tail.js, read-session-log-entries.js, entries-to-markdown.js
- config/routes/get-logs.js, post-client-log.js, get-session-log-file.js, get-logs-download-all.js
- config/index.js — register(): monta rutas, se suscribe a nada (fuente de verdad de config)
- **Contrato:** único dominio que escribe config.json. Otros dominios leen config solo via `bus.emit('config:get')` síncrono (request/response pattern) o snapshot inyectado en cada bus event — nunca importan config/store.js directo.

## /canales
- canales/state/channel-maps.js — tiktokChannels/twitchChannels/youtubeChannels
- canales/tiktok/connect-tiktok-channel.js, reconnect-tiktok.js, cleanup-after-last-channel.js, clean-username.js
- canales/twitch/connect-twitch.js, fetch-twitch-profile.js, clean-channel.js
- canales/twitch/oauth/{start,poll-device-token,refresh-token,ensure-access-token,cancel-poll,status,disconnect}.js
- canales/twitch/eventsub/{connect-socket,create-follow-subscription,start,stop,schedule-reconnect}.js
- canales/youtube/connect-youtube.js, parse-target.js, stop-chat.js
- canales/obs/{connect,disconnect,schedule-reconnect,save-replay}.js — clips depende de este submódulo vía bus, no importa directo
- canales/rate-limit.js — connectRateLimiter/isConnectRateLimited
- canales/routes/{connect,disconnect,platforms-status,platforms-connect,platforms-disconnect,list-channels,add-channel,remove-channel,obs-connect,obs-disconnect,obs-save-replay,platform-config,oauth-*}.js
- canales/broadcast-channels.js
- canales/index.js — register(): monta rutas + arranca listeners de conexión; on eventos internos de conexión emite al bus: `bus.emit('canal:mensaje-crudo', {platform, raw})`, `bus.emit('canal:gift', ...)`, `bus.emit('canal:follow', ...)`, `bus.emit('canal:like', ...)`, `bus.emit('canal:estado', ...)`
- **Contrato:** Canales es el ÚNICO productor de eventos crudos de plataforma. No conoce Chat, Overlay ni Moderación — solo publica al bus.

## /chat
- chat/sanitize-for-tts.js, clean-name.js, is-auto-generated.js, is-unreadable.js, resolve-display-name.js
- chat/normalize-for-moderation.js, normalize-aggressive.js
- chat/is-admin-identity.js
- chat/emit-chat-message.js — orquestador: recibe `canal:mensaje-crudo` del bus, llama moderación (vía contrato síncrono, ver abajo), decide TTS, emite `chat:mensaje-permitido` / `chat:mensaje-bloqueado`
- chat/routes/test-chat.js — POST /api/test/chat
- chat/index.js — register(): `bus.on('canal:mensaje-crudo', emitChatMessage)`
- **Contrato con Moderación (única dependencia dura, sync):** Chat requiere veredicto de moderación ANTES de decidir TTS/overlay. Se resuelve con una interfaz mínima inyectada por el core al registrar el dominio: `moderacionPolicy.evaluate(msg) → {isSpam, isMuted, isBanned, isFollower}`. Esta interfaz vive en `core/contracts/moderacion-policy.js` (tipo/JSDoc), la IMPLEMENTA moderacion/index.js y la EXPONE al core; el core la inyecta en chat/index.js. Si moderación lanza excepción, el contrato tiene default fail-open documentado (mensaje se trata como no-spam) para que un bug en /moderacion no silencie el chat entero.
- **Contrato de salida:** Chat nunca llama a Overlay/Sonido directo. Publica `chat:mensaje-permitido` con el mensaje ya enriquecido (badge, nombre resuelto); Overlay, Sonido, Movil se suscriben.

## /moderacion
- moderacion/store/{create-store,key-for,parse-key,flush,load,backup-and-reset,normalize-record,purge,sweep-expired}.js
- moderacion/store/{ensure,touch,mark-follower,get,get-effective,to-dto,list,stats,mutate,set-mute,set-ban,clear-punishments,set-whitelist,remove,clear-all,shutdown}.js
- moderacion/filters/{is-spam,moderation-stage,is-duplicate-recent,blocked-matchers}.js
- moderacion/filters/blocked-words-file.js — load/save blocked-words.md
- moderacion/policy.js — implementa el contrato `evaluate(msg)` que consume /chat; internamente usa store + filters
- moderacion/routes/{preview,viewers,stats,mute,unmute,ban,unban,clear,follower,delete-viewer,delete-all-viewers,blocked-words-get,blocked-words-export,blocked-words-import,block-word,unblock-word}.js
- moderacion/index.js — register(): monta rutas, expone `policy.evaluate` al core (`core.provideContract('moderacionPolicy', policy)`), se suscribe a `canal:mensaje-crudo` para `touch()`, a `canal:follow` para `markFollower()`. `shutdown()` propio (flush store).
- **Contrato:** único dueño de moderation.json y blocked-words.md. Nadie más los toca.

## /overlay
- overlay/state/{overlay-state,reset,recompute-follower-base,set-follower-base,extract-follower-count,follower-refresh-timer}.js
- overlay/compute-gift-usd.js
- overlay/routes/{overlay-stats,gifts-list,upload-bg,delete-bg,test-gift,test-follow,test-share,test-sub,test-cheer,test-raid,test-likes}.js
- overlay/index.js — register(): `bus.on('canal:gift', ...)`, `bus.on('canal:follow', ...)`, `bus.on('canal:like', ...)`, `bus.on('canal:sub'/'cheer'/'raid', ...)`, `bus.on('chat:mensaje-permitido', ...)` (badges en overlay chat) → transforma y `bus.emit('overlay:actualizar', payload)`; core traduce a WS broadcast.
- **Contrato:** Overlay es puramente consumidor + transformador de estado visual. No escribe en moderation.json ni en config.json.

## /sonido
### sonido/tts/
- sonido/tts/is-rate-limited.js
- sonido/tts/langs.js — GOOGLE_TTS_LANGS etc (compartido con /idioma vía re-export, no duplicado)
- sonido/tts/routes/generate.js — POST /api/tts
- sonido/tts/routes/voices.js — GET /api/voices

### sonido/musica/
- sonido/musica/handle-request.js — handleMusicRequest (!p)
- sonido/musica/resolve-youtube-id.js, resolve-full-track.js, extract-youtube-video-id.js
- sonido/musica/format-duration.js (única fuente, sin duplicado)
- sonido/musica/broadcast-state.js, advance-queue.js, resolve-and-save-playlist.js, set-playlist-enabled.js
- sonido/musica/engine/{create,spawn-child,run-ytdlp,common-args,detect-js-runtime,download-binary,ensure-ready,get-status,check-for-updates,to-track,search,get-info,create-stream,shutdown}.js
- sonido/musica/routes/{stream,engine-status,queue,skip,next,config-get,config-patch,ban,unban,playlist-get,playlist-put,playlist-toggle,playlist-shuffle}.js

### sonido/soundpad/
- sonido/soundpad/load-sounds.js, save-sounds.js, sync-to-mobile-state.js
- sonido/soundpad/routes/{list,upload,patch,delete}.js
- sonido/soundpad/shortcuts.js — register/unregister IPC (llamado por main via core/ipc-bridge)

- sonido/index.js — register(): `bus.on('chat:mensaje-permitido', ...)` → decide hablar o no (según config de voz/idioma), detecta `!p` (delegar a musica), expone `bus.emit('sonido:hablar', text)` que main.js/renderer consume vía WS/IPC
- **Contrato:** Sonido decide QUÉ se lee, pero nunca decide moderación (ya viene resuelta en chat:mensaje-permitido).

## /movil
- movil/state/mobile-state.js
- movil/allowed-ws-client.js
- movil/validate-request.js — middleware IP privada
- movil/local-ip.js, is-private-ip.js (reusa core/security)
- movil/routes/{mobile-page,local-ip,qr,state,command}.js
- movil/has-desktop-client.js
- movil/allowed-actions.js — MOBILE_ALLOWED_ACTIONS
- movil/index.js — register(): rutas + `bus.on('*', mirrorRelevantEventsToMobileState)`; comandos entrantes se re-emiten como `bus.emit('movil:comando', cmd)` — canales/sonido/clips se suscriben, nunca movil llama funciones de otro dominio directo.
- **Contrato:** Movil es un espejo de solo lectura del estado + un traductor de comandos hacia el bus. No conoce lógica interna de otros dominios.

## /bot
- bot/parse-command.js — hoy solo detecta `!p`; diseñado para crecer a más comandos sin tocar otros dominios
- bot/index.js — register(): `bus.on('chat:mensaje-permitido', parseCommand)` → si matchea, `bus.emit('bot:comando', {cmd:'play', args})`; /sonido se suscribe a `bot:comando`
- **Contrato:** separa detección de comando (bot) de ejecución (sonido). Hoy acoplados en handleMusicRequest — en la reconstrucción se separan para poder agregar comandos futuros sin tocar /sonido.

## /clips
- clips/global-shortcut.js — registra Ctrl+Shift+M (uiohook/globalShortcut vía core/ipc-bridge)
- clips/mark-clip.js — emite `bus.emit('clips:marcar')`
- clips/index.js — register(): `bus.on('clips:marcar', ...)` → llama contrato `canales.obs.saveReplay()` (inyectado, mismo patrón que moderacionPolicy) o vía `bus.emit('canal:obs:guardar-replay')` si se prefiere full async
- **Contrato:** Clips no conoce el protocolo OBS WS — solo pide "guarda replay" al bus; Canales/obs lo ejecuta.

## /avanzado
- avanzado/feature-flags.js — FEATURES (musicBot, etc)
- avanzado/accesibilidad.js — a11y config (re-expone config/validators específicos)
- avanzado/index.js — register(): agrega rutas propias si las hay; hoy es mayormente UI (advanced.html) + reexport de /configuracion y /reporte-bug

## /reporte-bug
- reporte-bug/webhook-url.js
- reporte-bug/discord/{send-attempt,post-webhook}.js
- reporte-bug/routes/report-bug.js
- reporte-bug/session-log-path.js
- reporte-bug/retention-sweep.js — barrido de logs viejos al iniciar
- reporte-bug/error-listeners.js — se suscribe a `bus.on('error:handled')`/`bus.on('error:uncaught')` (emitidos por core/error-boundary y por process.on handlers en core/shutdown) para reenviar a telemetría
- reporte-bug/index.js — register()
- **Contrato:** único punto que sabe hablar con Discord webhook y con telemetry/connectors/errors.js.

## /idioma
- idioma/google-tts-langs.js, dict-filter-langs.js, voice-to-dict-lang.js
- idioma/voice-script-regex.js
- idioma/message-matches-voice-script.js, message-matches-dict-lang.js
- idioma/lang-dicts.js — carga public/lang-words/*.json
- idioma/index.js — register(): expone `idioma.filtrar(text, voiceId)` como contrato consumido por /moderacion (filtro de idioma es parte de moderationStage hoy) y por /sonido (voces disponibles)
- **Contrato:** único dueño de diccionarios/regex de idioma. Moderación y Sonido lo consumen vía función pura importada del contrato publicado (no vía bus, porque es cómputo síncrono sin estado compartido mutable).

## /donar
- No existe funcionalidad real hoy (los "créditos de donantes" son gifts de TikTok, ya cubiertos en /overlay). Carpeta se crea vacía con `donar/index.js` no-op documentando la ausencia, lista para cuando se implemente donación económica real (ej. Streamlabs/PayPal) sin tocar /overlay.

## /telemetria (transversal, pero aislado — no estaba en tu lista, agrego porque existe y cruza todos los dominios)
- telemetria/index.js, transport.js, buffer.js, creator-cache.js, identity.js
- telemetria/connectors/*.js — un archivo por dominio que traduce (chat, overlay, canales/platforms, canales/creators, movil, sonido/counters, moderacion, obs, updates, errors, settings)
- **Contrato:** telemetria NUNCA se suscribe a lógica de dominio directo — cada dominio importa su propio conector y llama `telemetria.track(...)`, así un fallo de red en telemetría no puede tumbar ningún dominio (try/catch interno + no-op si falla init).

## /electron-shell (antes: partes transversales de main.js/preload.js — no es un "dominio funcional" del producto pero necesita casa)
- electron-shell/window.js, tray.js, updater.js, ipc-bridge.js, uiohook.js, single-instance.js
- Es el único lugar que hace `require` de /core y orquesta el arranque; los dominios de negocio no lo conocen.

---

# Contratos entre módulos — resumen

1. **Bus de eventos (default, 90% de los casos):** un dominio emite, cero o más dominios escuchan. Nombres de evento con prefijo de dominio productor (`canal:*`, `chat:*`, `clips:*`, `movil:*`, `bot:*`). Un listener que lanza excepción se captura en `core/error-boundary.js` y se loguea — jamás detiene a los demás listeners ni al productor.
2. **Contratos síncronos inyectados (excepción, solo cuando el orden importa):** moderacionPolicy.evaluate() (chat depende del veredicto antes de continuar) e idioma.filtrar() (cómputo puro). Se definen como interfaz en `core/contracts/*.js`, el core los resuelve en tiempo de registro y los inyecta — nunca `require('../moderacion/...')` directo desde otro dominio.
3. **Estado propio por dominio:** cada store (moderation.json, config.json, sounds-config.json, blocked-words.md) tiene un único dueño. Otros dominios solo leen snapshots vía evento o contrato, nunca importan el store.
4. **Fallo aislado:** `core/register-domain.js` envuelve `domain.register()` en try/catch; si un dominio falla al montar, el resto de la app sigue funcionando y se loguea/telemetría el fallo (dominio "reporte-bug" se entera igual porque escucha `error:uncaught` del core, no del dominio roto).

---

# Orden recomendado de construcción e integración

1. **/core** — kernel primero (bus, error-boundary, logger, http/ws server, register-domain). Sin esto nada más puede montar.
2. **/configuracion** — no depende de nadie, todos lo necesitan (o su snapshot).
3. **/idioma** — puro, sin estado mutable compartido, fácil de aislar y testear.
4. **/reporte-bug** — aislado, solo necesita el bus de errores del core; conviene tenerlo temprano para capturar fallos de los siguientes pasos.
5. **/moderacion** — depende de /idioma (filtro) y /configuracion (validators de duración de castigo), pero es autocontenido.
6. **/canales** — el productor de eventos crudos; sin dependencias funcionales de otros dominios de negocio (solo /configuracion).
7. **/chat** — depende del contrato de /moderacion y de eventos de /canales. Es el primer punto de integración real multi-dominio.
8. **/overlay** y **/movil** — consumidores puros de eventos de /canales y /chat, se pueden construir en paralelo una vez el bus tiene los eventos reales.
9. **/idioma+sonido/tts** y **/sonido/soundpad** — consumidores de /chat, sin dependencia entre sí.
10. **/bot** y **/sonido/musica** — bot detecta, musica ejecuta; requieren /chat y /canales ya estables porque tocan el flujo `!p` real.
11. **/clips** — depende del contrato de OBS dentro de /canales, es el más chico y aislado, buen candidato de validación final del patrón de contratos síncronos.
12. **/avanzado** y **/donar** — mayormente UI/placeholder, se integran al final sin riesgo.
13. **/electron-shell + /telemetria** — se conectan al final envolviendo todo; telemetría en particular debe ser lo último para poder instrumentar el resto ya construido.

Aislados primero (config, idioma, reporte-bug), luego el productor (canales), luego el orquestador central (chat+moderación), luego los consumidores (overlay, movil, sonido), y al final lo más acoplado a hardware/proceso (clips, electron-shell).
