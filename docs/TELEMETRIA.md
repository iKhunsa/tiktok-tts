# Telemetría, Error Tracking y Analytics

## Telemetría (`features/telemetria/`)

Dominio aparte que reporta uso agregado y anónimo a un servicio propio (`telemetria-tts`, repo separado, self-hosted en Docker — no Vercel). Sin `TELEMETRY_URL` configurada, el módulo es un no-op: cero peticiones de red.

- **`features/telemetria/index.js`** — dominio registrado normal (`register({bus, logger})`): engancha los conectores al bus de inmediato, aunque `runtime.init()` todavía no haya corrido (`track()` es no-op mientras no esté habilitada).
- **`features/telemetria/runtime.js`** — el ciclo de vida real (`init`, `track`, `flush`, `shutdown`). Separado de `index.js` porque `init()` necesita datos que solo Electron tiene (`app.getVersion()`, `app.getPath('userData')`) — lo llama `main.js` tras `waitForServer`.
- **`features/telemetria/transport.js`** — envía batches por `fetch` nativo a `TELEMETRY_URL` (o al `url` de `telemetry.json`), con cola en disco (`features/telemetria/buffer.js`) y reintentos. 4xx ya no se trata como éxito silencioso: todo fallo de red queda logueado (`telemetria.envio.*`).
- **`features/telemetria/connectors/*.js`** — un conector por área (creators, platforms, counters, obs, mobile, overlays, updates, settings). Cada uno escucha el bus de dominios (`canal:estado`, `movil:comando`, etc.) o el espejo de logs (`core/logger.js` emite **todo** log como `log:entry` al bus) en vez de que cada dominio de negocio tenga que conocer telemetría. `counters.js` agrega eventos de alta frecuencia (TTS, música, moderación) en un contador por latido de 5 min en vez de uno por mensaje.
- **URL de configuración:** sale de `TELEMETRY_URL` (env, inyectada en build) o de `%APPDATA%\tiktok-live-tts\telemetry.json` — archivo separado de `config.json` a propósito, porque `features/configuracion/` descarta claves que no reconoce y lo borraría en el primer guardado.

### Blocked Words Telemetría

`connectors/blocked-words.js` + `blocked-words/` — snapshot de la lista de palabras bloqueadas, activo por defecto. `blockedWordsTelemetryDisabled` (default `false`) queda como llave técnica por cuenta para apagarlo (`true` = cero eventos); se renombró desde `blockedWordsTelemetryEnabled` para que el `false` guardado por el antiguo interruptor opt-in no deje cuentas apagadas. 

Lee la lista por el bus (`moderacion:palabras-get`, aviso `moderacion:palabras-cambiadas`), la sanea igual que el servidor, calcula hash sha256 y guarda el último envío en `accountDataPath('blocked-words-telemetry.json')`. Envía al arrancar si pasaron >7 días, al cambiar la lista (debounce 10 min) y cada semana; mismo hash y <7 días = nada. No incluye nick ni IDs de espectadores, solo palabras de la lista del streamer. 

Texto legal: publicado en la v2.1 de `docs/legal/` (ver `NOTAS-DE-REVISION.md` §6).

### UI Telemetría

Casi todos los eventos se emiten directo desde los conectores. Solo `tts:skipped`, `tts:queue-overflow`, `ui:language-set` y los `ui:*` de uso de la interfaz (Discord, vistas, overlays, promos, planes, tours…) nacen en el renderer y llegan al bus vía IPC: 

`trackUi(evento, valor)` (`interfaz/src/nucleo/telemetria-ui.js`) → `window.electronAPI.trackEvent` → `preload.js` → `ipcMain.on('telemetry:track', ...)` en `electron-shell/ipc-bridge.js`, con la misma lista blanca de nombres en ambos lados. 

`payload` solo se reenvía si es string, recortado a 24 chars; el valor es siempre de lista cerrada y lo valida `aptabase.js` (`EVENTOS_UI`) — nunca texto libre.

## Error Tracking (`electron-shell/glitchtip.js`)

GlitchTip (self-hosted, compatible con Sentry, `@sentry/electron`). **Los errores van acá, no a Aptabase.**

Captura:
- Crashes del main process
- `error:handled`/`error:uncaught` del bus
- Con breadcrumbs (150) de la actividad previa
- Snapshot de `estado_app` (plataformas, OBS, minutos, config)
- Tail del log de sesión metido en el issue
- Fingerprint en español (`error_conexion_tiktok`, …)
- `warn` promovidos a issue
- Detección de "sesión problemática"
- Perf spans (`tracesSampleRate: 0.05`)

El botón "Reportar bug" también llega acá. DSN de ingesta (no secreto) override por `SENTRY_DSN`/`GLITCHTIP_DSN` o `glitchtip.json` en userData.

## Analytics de producto (`electron-shell/aptabase.js`)

Aptabase (self-hosted en `https://aptabase.tiklivetts.es`, `@aptabase/electron`). **Solo analítica de producto — conteo de eventos, funnels, DAU/MAU, retención. Los errores NO van acá.** Sin `APTABASE_APP_KEY` (env o `aptabase-config.json` bakeado) es un no-op total.

### Arquitectura

**Regla igual que GlitchTip/telemetría:** los dominios no conocen Aptabase. Loguean su evento de negocio; `aptabase.js#attach` mapea `log:entry` + algunos eventos directos del bus (`canal:estado`, `movil:comando`, `reporte-bug:enviado`, `ui:language-set`) → `trackEvent()`.

`init()` corre en `main.js` **antes de `app.isReady()`** (requisito del SDK) pero **después** del lock de instancia única (para no doble-disparar `installacion`/`app_started`). Recibe `{appVersion, isPackaged, isDebug, userDataDir, logger}` — patrón de inyección como `telemetria/runtime.js`.

### Evento "Instalación"

Evento que se dispara **exactamente una vez en la vida del usuario**, vía marca persistida `%APPDATA%\tiktok-live-tts\aptabase-instalacion.json` (helper compartido `electron-shell/install-marker.js`, también lo usa glitchtip con su propio archivo). 

Conteo diario en el dashboard = instalaciones únicas de por vida (Aptabase no tiene id de cliente). Sin `machine_id` a propósito (máxima privacidad).

### Eventos principales

- **Ciclo de vida:** `installacion`, `app_started`, `app_updated`, `session_ended`
- **Activación:** `platform_connected`, `platform_connect_failed`, `first_tts`
- **Adopción:** `overlay_opened`, `mobile_paired`, `mobile_command`, `clip_marked`, `music_requested`, `promo_fired`, `bug_report_sent` (solo `version`, nunca el canal), `soundpad` en resumen, `overlay_test` (`tipo`), `overlay_url_copied` (`overlay`), `view_opened` (`view`, 1 vez por vista y sesión), `tour_started` (`tour`), `event_effects_toggled` (`state`), `news_opened`, `donations_opened`, `portalview_opened`
- **Discord y promos:** `discord_modal_opened` y `discord_join_clicked` con `source` = `titlebar|sidebar|account_menu|sidebar_banner|connect_fail|bug_report|idea_modal|chat_banner_1..4` — lo que no esté en la lista cae a `otro` —, `promo_code_opened`, `promo_code_copied`, `promo_plans_clicked`, `tiktok_banner_clicked`
- **Cuentas y planes:** `auth_signed_in`, `auth_signed_out`, `plans_opened`, `checkout_started` con `plan`/`intervalo`, `pro_gate_hit` con `featureId`, `account_deleted` sin props
- **Config:** `config_changed` **solo la clave, nunca el valor**, `voice_changed`, `ui_language_set`
- **Moderación:** `moderation_action`, `moderation_action_failed`, `mod_words_saved`

`platform_connect_failed` sale de `canales.conexion.fallida` con `platform` + `code` (nunca el mensaje: puede traer el canal).

### Resumen de sesión

Los de alta frecuencia (TTS, música, errores, mensajes filtrados) se acumulan en memoria y salen como props bucketeadas de `session_ended` (1 POST al cerrar), nunca 1 evento por ocurrencia. `bucket()` vive en `electron-shell/bucket.js` (testeado en `test/aptabase-bucket.test.js`).

**Flush manual:** el SDK v0.3.1 **no batchea ni flushea al cerrar** — cada `trackEvent` es su propio POST. `shutdown()` manda `session_ended` y espera los POST en vuelo con race de 1500 ms, dentro del `Promise.allSettled` de `main.js#before-quit`.

### Privacidad

Toda prop pasa por `sanear()` (rutas de home fuera) + clip a 200 chars, tope de 20 props/evento. Nunca nick/userId/ip/texto libre.
