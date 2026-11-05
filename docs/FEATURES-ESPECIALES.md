# Features Especiales — Moderación, Telemetría, MCP, Overlays

## Moderación de espectadores (`features/moderacion/`)

Registro persistente de todo espectador que interactúa, más los seguidores, con moderación **local** por usuario (no se toca la plataforma). Único dueño de `moderation.json` (en `DATA_BASE`, o sea `app.getPath('userData')`).

### Store

El store está migrado: un archivo por función (`features/moderacion/store/*.js`) sobre un `state` compartido — ver `features/moderacion/store/create-store.js`.

- **Clave por usuario:** `` `${platform}:${id}` ``; sin id estable cae a `` `${platform}:name:${nick}` `` y se marca `idk:'name'` (castigo frágil: se pierde si el usuario cambia de nombre).
- **Dos ejes ortogonales:** `mute` (el mensaje se ve, el TTS no lo lee) y `ban` (el mensaje ni se emite). Valores `0` / `-1` (indefinido) / epoch ms.
- **Expiración perezosa:** comparación contra `Date.now()`, nunca un `setTimeout` por usuario. Sobrevive a la app cerrada y al equipo suspendido.
- **Cap de 5.000 espectadores** con purga LRU a 4.000 que jamás descarta seguidores, whitelisted ni usuarios con castigo vivo.

### Flujo de mensajes

`features/chat/emit-chat-message.js` es el **único** punto por el que salen los mensajes de las 3 plataformas:
1. Llega crudo de `features/canales/` vía el bus (`canal:mensaje-crudo`)
2. Llama a `moderacionPolicy.evaluate()` (contrato inyectado, fail-open)
3. Publica `chat:mensaje-permitido`/`chat:mensaje-bloqueado`

**UI:** vista "Moderación" en el menú izquierdo, pestañas Seguidores / No seguidores.

### Rust Chat Guard

Segunda capa de contenido, encendida por defecto en shadow (`rustGuardEnabled: true`, `rustGuardMode: 'shadow'|'enforce'`). Corre DESPUÉS del guard JS y solo endurece (BLOCK→drop, REVIEW→mute).

**UI:** Ajustes > «Moderación del chat» — maestro, nivel/idiomas/personalizado, modo, palabras permitidas, estado del motor.

**Idiomas según la voz:** con `chatGuardLangsAuto` (default `true`) los idiomas del motor = `localesForVoice(ttsVoiceLang)` (`core/chat-guard-voice-languages.js`); con `false` manda `chatGuardLangs`.

### Popup de moderación

Badge en la vista Chat. `emit-chat-message.js` publica por WS: `moderation-blocked {platform, accion: drop|mute|shadow, origen, motivo, nick, text, timestamp}`. El cliente lo guarda en `nucleo/estado/moderacion-sesion.js`: buffer **solo en memoria**, máx. 200, jamás a disco ni telemetría.

---

## Telemetría, Error Tracking y Analytics

### Telemetría (`features/telemetria/`)

Dominio aparte que reporta uso agregado y anónimo a un servicio propio (`telemetria-tts`, self-hosted en Docker). Sin `TELEMETRY_URL` configurada, el módulo es un no-op: cero peticiones de red.

- **`features/telemetria/index.js`** — dominio registrado normal: engancha los conectores al bus de inmediato.
- **`features/telemetria/runtime.js`** — ciclo de vida real (`init`, `track`, `flush`, `shutdown`). Separado porque `init()` necesita datos que solo Electron tiene.
- **`features/telemetria/transport.js`** — envía batches por `fetch` nativo con cola en disco y reintentos.
- **`features/telemetria/connectors/*.js`** — un conector por área (creators, platforms, counters, obs, mobile, overlays, updates, settings). Cada uno escucha el bus en vez de que cada dominio conozca telemetría.

**Blocked Words:** snapshot de la lista de palabras bloqueadas, activo por defecto. Lee la lista por el bus, calcula hash sha256 y guarda último envío en `accountDataPath('blocked-words-telemetry.json')`. Envía al arrancar si pasaron >7 días, al cambiar la lista (debounce 10 min) y cada semana; mismo hash y <7 días = nada.

**UI Telemetría:** `tts:skipped`, `tts:queue-overflow`, `ui:language-set` y los `ui:*` nacen en el renderer y llegan al bus vía IPC: `trackUi(evento, valor)` → `window.electronAPI.trackEvent` → `preload.js` → `ipcMain.on('telemetry:track', ...)` en `electron-shell/ipc-bridge.js`.

### Error Tracking (`electron-shell/glitchtip.js`)

GlitchTip (self-hosted, compatible con Sentry, `@sentry/electron`). **Los errores van acá, no a Aptabase.**

Captura: crashes del main + `error:handled`/`error:uncaught` del bus, con breadcrumbs (150), snapshot de `estado_app`, tail del log de sesión, fingerprint en español, `warn` promovidos a issue, detección de "sesión problemática", perf spans.

DSN de ingesta override por `SENTRY_DSN`/`GLITCHTIP_DSN` o `glitchtip.json` en userData.

### Analytics de producto (`electron-shell/aptabase.js`)

Aptabase (self-hosted en `https://aptabase.tiklivetts.es`, `@aptabase/electron`). **Solo analítica de producto — conteo de eventos, funnels, DAU/MAU, retención. Los errores NO van acá.**

**Evento "Instalación":** Evento que se dispara **exactamente una vez en la vida del usuario**, vía marca persistida `%APPDATA%\tiktok-live-tts\aptabase-instalacion.json`. Conteo diario en el dashboard = instalaciones únicas de por vida. Sin `machine_id` a propósito (máxima privacidad).

**Resúmenes de sesión:** Los de alta frecuencia se acumulan en memoria y salen como props bucketeadas de `session_ended` (1 POST al cerrar), nunca 1 evento por ocurrencia. `bucket()` vive en `electron-shell/bucket.js`.

---

## MCP — Servidor de herramientas para agentes

Dominio que expone las capacidades de la app como **tools MCP** (Model Context Protocol) para que un agente (Claude Code, Claude Desktop) opere la app: leer el chat, moderar, manejar música, consultar estado.

Transporte **Streamable HTTP** en `POST /mcp` (SDK `@modelcontextprotocol/sdk`, stateless, server+transport nuevos por request). `features/mcp/` se registra **último** en `server.js`.

### Registro de tools

**`core/contracts/mcp-registry.js`** — registro append-only (singleton require-once).

API:
- `registerTool({name, title, description, inputSchema, handler, readOnly?, destructive?, idempotent?, domain})`
- `listTools()`, `callTool(name, args)`, `registerStateProvider(fn, domain)`, `collectState()`

### Regla de crecimiento

Todo dominio que monta `app.post/patch/delete` **debe** llamar `mcp.registerTool()` desde su propio `register()`. Lo verifican `scripts/check-mcp.js` (grep) y `test/mcp-registry.test.js` (boot + assert).

**Exentos:** `chat` (lectura vía `get_recent_chat`), `reporte-bug` (post externo).

### Seguridad

**Doble gate de destructivas:**
- `mcpEnabled` (default `true` — endpoint solo-localhost)
- `mcpDestructiveToolsEnabled` (default `false`)

Las tools con `destructive:true` (ban/mute/disconnect/delete/set_config) se filtran cuando el 2º toggle está off.

**Auth remota:** por defecto solo-localhost. Env `MCP_TOKEN` seteada → acepta cualquier host con `Authorization: Bearer <token>`.

### UI

Sección "Agente MCP" en la tienda de plugins (`interfaz/src/vistas/principal/mcp/`, nace oculta) — toggles, endpoint, snippets, tabla de tools por dominio.

`GET /api/mcp/info` — estado + catálogo de tools (GET, sin auth).

---

## Overlays — Archivos .epik y esquema de ajustes

### Archivos `.epik` (`features/epik/`)

Overlays a medida que Epik entrega como un archivo (ZIP con `manifest.json` + HTML/CSS/JS). El streamer lo suelta en el último acordeón del overlay y queda como skin `epik:<id>` (gratis, por cuenta). Hoy solo `musica`.

**Backend:** `read-zip.js` → `validate-manifest.js` → `store.js` (extrae a `accountDataPath('epik','paquetes',id)`).

**Rutas:**
- `GET /api/epik`
- `POST /api/epik/importar?overlay=` (409 si es de otro acordeón)
- `DELETE /api/epik/:id`
- `GET /epik/:id/*` con CSP `sandbox allow-scripts` + `connect-src 'none'`

**Tools MCP:** `epik_list|import|delete`

**Overlay:** `overlay-musica-entrada.js` elige entre el overlay nativo y `compartido/epik/anfitrion-musica.js`, que monta el diseño en un iframe sandbox y le pasa por `postMessage` la config.

**UI:** `vistas/principal/epik/` — sección, ajustes propios en `appSettings.epik[id]` (por id, sobreviven a actualizaciones), selector de skins.

**Recursos:** SDK, guía, plantilla, simulador y empaquetador viven en `C:\Users\liber\OneDrive\Documentos\.tiklivetts\Templete Overlay` (`LEEME.md`, `GUIA-CLAUDE.md`).

### Overlays de OBS — esquema de ajustes (`interfaz/compartido/estilo/`)

Chat, Top Likers y Top Donadores se personalizan con un **esquema declarativo** (`esquemas.js` + `campos-*.js`): cada campo `{ clave, param, tipo, def, grupo }` es la única fuente de su default, su nombre en la URL y su control en el configurador.

`construirQuery`/`leerConfig` (`query.js`, puras y testeadas) convierten config ↔ querystring omitiendo defaults.

**Para agregar un ajuste:** un campo en el esquema + sus claves `overlayCfg.campo.<clave>` en los 10 locales; el panel "Personalizar" (`vistas/principal/campos-overlay/`) lo dibuja solo.

**Rankings:** el **servidor es la fuente de verdad** (`top-likers`/`top-donors` por WS, snapshot en `/api/overlay-stats`); `compartido/iniciar-ranking.js` + `leaderboard.js` solo pintan.

**Avatares y roles:** Avatar y roles (moderador/suscriptor) salen de `raw` en `features/chat/author-meta/`. El avatar de TikTok lo decodifica `@tiklivetts/tiktok-live-client` (`avatarUrl`); las URLs son firmadas y caducan → placeholder.

**Fuentes:** Google Fonts por CDN, solo desde `cargarFuente()` (`fuentes.js`); el default es la del sistema.
