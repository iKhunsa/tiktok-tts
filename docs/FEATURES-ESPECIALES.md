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

## Buscador de GIFs y "Mis GIFs" (`features/gifs/` + `electron-shell/gif-browser/`)

Sección «Buscador de GIF» del editor de canvas: un navegador para encontrar GIFs en la web (Google, GIPHY, Tenor o cualquier otra página) y una biblioteca personal por cuenta donde se guardan con un clic.

**Navegador (`electron-shell/gif-browser/`):** reutiliza Portal View, no crea otro motor — misma sesión persistente por cuenta (`getPortalViewSession`), mismo `tab-pool` (con la opción `preload`) y `normalizeUrl`. Es una sola pestaña que el renderer coloca en el hueco `.gif-pagina` (`gifbrowser:open|bounds|hide|close`), no anclada a la derecha como el panel de Portal View. Los enlaces que abren ventana nueva se cargan en la misma pestaña.

**Selector (`picker-preload.js`):** corre en el mundo aislado del `preload` (`contextIsolation` + `sandbox`), no expone nada a la página (sin `contextBridge`) y solo hace caso a eventos `isTrusted`. Detecta `<img>` .gif/.webp/.apng (también por `<picture><source type>`), `<video>` en bucle (`loop` o `autoplay`+`muted`) y fondos CSS, usando `elementsFromPoint` para que un enlace transparente encima no oculte el GIF. Resalta solo eso con un marco rojo `#F0213A` dibujado en un shadow root (no toca los estilos de la página), intercepta el clic y abre una tarjeta flotante con vista previa y «Añadir a TikLiveTTS». Es un solo archivo porque un preload en sandbox no puede hacer `require` de módulos locales; sus textos los traduce el renderer y se los entrega por `gifbrowser:textos`.

**IPC:** `gifbrowser:importar` solo se acepta del `webContents` y el frame principal de la pestaña propia, de uno en uno, y solo reenvía `url`, `titulo` y `origen` a `POST /api/gifs/importar`.

**Backend (`features/gifs/`):**
- `GET /api/gifs`, `POST /api/gifs/importar`, `POST /api/gifs/verificar`, `PATCH|DELETE /api/gifs/:id`, `POST /api/gifs/carpetas`, `PATCH|DELETE /api/gifs/carpetas/:id`, `GET /gifs/<archivo>`.
- `validar-url.js` (solo http(s), sin credenciales, y el servidor debe resolver a una IP pública: este endpoint lo alcanza cualquiera en la red local) → `descargar.js` (tope de 15 MB y 15 s, redirecciones a mano validando cada destino, sin cabeceras ni cookies de otro origen; 401/403/429 se informan como «el sitio no lo permite» y no se reintentan) → `sniff.js` (reconoce por los bytes GIF con más de un fotograma, WebP animado, APNG, MP4 y WebM; rechaza imágenes fijas y archivos incompatibles).
- **Enlace o archivo:** de GIPHY, Tenor e Imgur (enlaces permanentes, `proveedores.js`) se guarda solo la referencia; de cualquier otro sitio se copia el archivo a `accountDataPath('gifs','archivos')`. Los duplicados se evitan por URL y por huella SHA-1 del contenido.
- `verificar-enlaces.js` marca `caducado` los enlaces que ya no existen o dejaron de ser animados (como mucho 12 por pasada, uno por día cada uno); un fallo pasajero no cambia el estado.
- Datos: `gifs/indice.json` por cuenta. Los errores viajan como `codigo` y el front los traduce (`gifs.error.<codigo>`).

**UI:** `vistas/principal/gif-buscador/` — guía previa con tres pasos (se puede no volver a mostrar y reabrir), navegador, y «Mis GIFs» (carpetas, buscar, renombrar, mover, copiar URL, eliminar en dos pasos). Todo texto que viene de la web (nombres, dominios) se pinta con `textContent`, nunca como HTML.

**Usar los GIFs en el editor de canvas** (`overlays-catalogo/`, solo en el editor unificado):
- **Capas GIF** (`gif-capas.js`, `editor-gifs.js`): la pestaña «GIF» de la biblioteca lista «Mis GIFs»; un clic pone el GIF en el centro del canvas y arrastrarlo lo deja donde se suelta (reutiliza `permitirArrastreGif`). Cada GIF es su propia capa, un overlay más con id `gif:<id del GIF>`: esquema `ESQUEMA_GIF` (tamaño, opacidad, X/Y/Z), ajustes en `appSettings.overlays['gif:<id>']` y página de OBS `overlay-gif.html?src=…` (`urlCapaGif`). El editor la trata como a cualquier otra (mover, redimensionar, apilar, copiar propiedades, escenas) gracias a una tarjeta virtual oculta en `#ovlTarjetas` y al esquema registrado en `ESQUEMAS` en tiempo de ejecución. `loadSettings` conserva las capas `gif:*` (deepMerge solo guarda claves conocidas).
- **GIF de la alerta** (`gif-alerta-panel.js`, `gif-selector-ventana.js`): el panel solo muestra el GIF en uso con un botón (Elegir, Cambiar, Quitar); la elección se hace en una ventana emergente con «Mis GIFs» (buscador y un único botón Usar). Como las tarjetas de alerta tienen un `body` de ancho fijo, `imagen-gif-alerta.js` lo ensancha lo que crece la imagen para que el texto no se comprima. Las alertas (`alertas`, `alertas-social` y los eventos de `EVENTOS_ALERTA`) tienen el campo oculto `gifAlerta` (param `gif`); el panel del editor ofrece elegir un GIF de la biblioteca, que sustituye la imagen de la alerta (`compartido/imagen-gif-alerta.js`, solo http(s)). El campo es `ui: 'oculto'`, así que no aparece en los ajustes de cada overlay.

- **Sonido de la alerta** (`sonido-alerta-panel.js`, `sonido-selector-ventana.js`): acordeón hermano del de GIF, con el mismo aspecto. Sin sonido solo hay el botón «Elegir sonido», que abre la ventana de «Mis sonidos» (lista con botón de oír y un único «Usar»); con sonido, la tarjeta con la canción, «Cambiar sonido» y la papelera, y debajo volumen, tono y un ecualizador básico opcional (graves, medios y agudos; apagarlo los deja a cero). Los campos ocultos viajan en la URL: `snd` (sonido), `sv` (volumen 0-100), `st` (tono, -12 a +12 semitonos), `sg`, `sm` y `sa` (graves, medios y agudos en dB, -12 a +12). `compartido/sonido-alerta.js` (`crearAudioAlerta`) es la única función que prepara el audio y la usan el overlay (`reproducirSonidoAlerta`) y la prueba del editor, así que suenan igual. El tono cambia también la velocidad (`playbackRate` con `preservesPitch = false`, y `defaultPlaybackRate` porque asignar `src` reinicia la velocidad); el ecualizador usa tres `BiquadFilter` de Web Audio solo si alguna banda está tocada (con `crossOrigin = 'anonymous'`, si no un audio de otro origen saldría mudo).
- **Alertas con skin `.epik`** (`compartido/epik/anfitrion-alerta.js`): la alerta la dibuja el diseño, pero el sonido lo reproduce el host (`reproducirSonidoAlerta(epik.cfg)`) y el GIF elegido viaja como `imagen` de la alerta pública (sustituye al icono o regalo). Sin esto, una alerta con skin `.epik` no sonaba ni mostraba el GIF.
- **Capas bloqueadas** (`editor-canvas.js`): el candado de cada fila de Capas (y «Bloquear» en el menú) deja la capa sin arrastrar, redimensionar ni borrar, y el clic del lienzo la atraviesa; sigue eligiéndose desde la lista. Se guarda en la escena (`bloqueadas`). Si ya hay una capa seleccionada y se hace clic sobre ella, gana aunque otra la tape.

**Probar alertas en OBS de verdad:**
- `obs-websocket` (puerto 4455) permite capturar una fuente (`GetSourceScreenshot`) y medir su audio (`InputVolumeMeters`) si la fuente tiene «Controlar audio mediante OBS»; así se comprobó que cada alerta se ve, muestra su GIF y suena. Si OBS responde «OBS is not ready», se arregla reiniciándolo.
- El audio de una fuente de navegador solo entra en la mezcla del directo con «Controlar audio mediante OBS» (`reroute_audio`); sin ella suena por los altavoces y no llega a los espectadores.
- Las URL de OBS llevan los ajustes (GIF, sonido, posición, tamaño): una fuente antigua no cambia sola. Hay que copiar el enlace nuevo del editor («Copiar enlace para OBS» da toda la escena en una sola fuente de 1920x1080).
- Los overlays de diseño fijo (alertas) se escalan a la fuente y la tarjeta va centrada: una fuente de 440x130 solo cabe la tarjeta de fábrica; con un GIF grande hay que agrandar la fuente al tamaño del bloque de la alerta.
- El filtro de spam descarta los mensajes de chat idénticos: una prueba automática debe mandar un texto distinto cada vez.

**Pendiente:** importar fotos fijas (hoy solo entran medios animados) y limitar el editor a usuarios Pro (hoy no hay bloqueo).

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
