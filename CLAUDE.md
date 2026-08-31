# TikTok TTS — Contexto del Proyecto para IA

## Qué es

App de escritorio Electron que lee en voz alta el chat de TikTok Live, Twitch y YouTube en tiempo real. Diseñada para streamers que quieren TTS integrado sin depender de herramientas externas. La UI corre dentro de la app (no en navegador externo). Los overlays (alertas, likes, seguidores) se pegan en OBS como Browser Source via `http://localhost:3000/overlay-*.html`.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Desktop shell | Electron 41 |
| Backend | Express + WebSocket (ws) en el mismo proceso Electron |
| TikTok connection | tiktok-live-connector (WebSocket scraping) |
| Twitch connection | tmi.js (IRC anónimo o autenticado) |
| YouTube connection | youtube-chat (scraping, requiere stream activo) |
| Kick connection | API pública kick.com + Pusher WS (`ws`, sin auth) |
| TTS | Google Translate TTS API (google-tts-api, online) |
| Auto-update | electron-updater → GitHub Releases |
| Build/CI | electron-builder + GitHub Actions (windows-latest) |
| Distribución | NSIS installer via GitHub Releases, sin firma de código |

## Arquitectura

Backend reconstruido por dominios (rebuild completo, ver `plan-fases/` para
el historial de las 14 fases y `arquitectura-propuesta.md` para el
documento de diseño vivo). Ya no es un monolito: `main.js`/`server.js` son
orquestadores delgados, toda la lógica de negocio vive repartida en
carpetas por dominio en la raíz del repo.

```
main.js (Electron main process)
  ├── require('./server.js')       ← arranca /core + registra los 14 dominios
  ├── electron-shell/window.js     ← BrowserWindow, carga http://localhost:3000
  ├── electron-shell/tray.js       ← ícono bandeja, menú open/exit
  ├── electron-shell/updater.js    ← autoUpdater, chequea GitHub Releases
  ├── electron-shell/uiohook.js    ← atajos globales (fullscreen-safe)
  ├── electron-shell/ipc-bridge.js ← IPC con el renderer (atajos, soundpad, telemetría)
  └── electron-shell/single-instance.js

server.js (Express + WS en puerto 3000)
  ├── core/                ← kernel: bus de eventos, logger, http/ws server, register-domain
  ├── configuracion/       ← único dueño de config.json y platform-config.json
  ├── idioma/              ← filtro de idioma/script de voz (puro)
  ├── reporte-bug/         ← webhook de Discord, retención de logs
  ├── moderacion/          ← moderation.json, blocked-words.md, policy.evaluate()
  ├── canales/             ← TikTok/Twitch/YouTube + OBS — único productor de eventos crudos
  ├── chat/                ← orquesta: crudo → moderación → chat:mensaje-permitido
  ├── overlay/             ← estado visual (gifts, followers, likes) para OBS
  ├── movil/               ← panel remoto (espejo de estado + comandos)
  ├── sonido/               ← TTS (Google), bot musical (yt-dlp), soundpad
  ├── bot/                 ← detección de comandos de chat (!p)
  ├── clips/                ← marca clip en OBS (atajo o comando móvil)
  ├── avanzado/ + donar/   ← feature flags, UI avanzada; donar es no-op documentado
  └── telemetria/           ← uso agregado anónimo, self-hosted (ver sección propia)
```

**Contrato entre dominios:** un dominio nunca importa el módulo interno de
otro (`require('../otro-dominio/...')`). Toda comunicación cruzada pasa por
`core/event-bus.js` (`bus.emit`/`bus.on`) o por un contrato síncrono
inyectado en `core/contracts/*.js` (ej. `moderacion-policy.js`,
`idioma-filtrar.js`, `obs-replay.js`) cuando el orden de ejecución importa
y no alcanza con un evento fire-and-forget. `core/register-domain.js`
monta cada dominio en su propio try/catch — un dominio que falla al
arrancar no tumba a los demás.

Endpoints HTTP relevantes (repartidos por dominio, ver cada carpeta para
el resto):
```
GET  /                       ← index.html (UI principal)
GET  /advanced.html          ← configuración avanzada
GET  /overlay-*.html         ← overlays para OBS
POST /api/connect            ← conecta a TikTok Live (canales/)
POST /api/tts                ← Google TTS → stream MP3 (sonido/)
WS   /                       ← broadcast eventos al browser (core/broadcast.js)
GET  /api/gifts-list         ← lista PNGs de regalos (overlay/)
POST /api/upload-bg          ← sube imagen fondo overlay (overlay/)
PATCH /api/config            ← ajusta config en runtime (configuracion/)
GET  /api/platforms/status   ← estado twitch/youtube (canales/)
POST /api/platforms/connect  ← conecta twitch o youtube (canales/)
POST /api/platforms/disconnect
GET  /api/moderation/viewers ← registro de espectadores (moderacion/)
POST /api/moderation/{mute,unmute,ban,unban,clear,follower}
```

## Moderación de espectadores (`moderacion/store/`)

Registro persistente de todo espectador que interactúa, más los seguidores, con
moderación **local** por usuario (no se toca la plataforma). Único dueño de
`moderation.json` (en `DATA_BASE`, o sea `app.getPath('userData')`). El store
está migrado un archivo por función (`moderacion/store/*.js`) sobre un
`state` compartido en vez de un closure — ver `moderacion/store/create-store.js`.

- Clave por usuario: `` `${platform}:${id}` ``; sin id estable cae a
  `` `${platform}:name:${nick}` `` y se marca `idk:'name'` (castigo frágil: se
  pierde si el usuario cambia de nombre). Las dos formas nunca se fusionan.
- Dos ejes ortogonales: `mute` (el mensaje se ve, el TTS no lo lee) y `ban`
  (el mensaje ni se emite). Valores `0` / `-1` (indefinido) / epoch ms.
- Expiración perezosa (comparación contra `Date.now()`), nunca un `setTimeout`
  por usuario: sobrevive a la app cerrada y al equipo suspendido.
- Escritura con debounce de 15 s (techo de 60 s) para la ingesta de alta
  frecuencia; las acciones de moderación hacen flush inmediato. `writeFileSync`
  a `.tmp` + `rename`. JSON corrupto → se aparta como `.corrupt-<ts>` y se
  arranca vacío; **nunca lanza**, porque el require corre al arrancar la app.
- Cap de 5.000 espectadores con purga LRU a 4.000 que jamás descarta
  seguidores, whitelisted ni usuarios con castigo vivo.
- `chat/emit-chat-message.js` es el **único** punto por el que salen los
  mensajes de las 3 plataformas: llega crudo de `canales/` vía el bus
  (`canal:mensaje-crudo`), llama sincrónicamente a `moderacionPolicy.evaluate()`
  (contrato inyectado por `moderacion/`, fail-open si lanza) y publica
  `chat:mensaje-permitido`/`chat:mensaje-bloqueado`. Los handlers de plataforma
  y el cliente no repiten ninguna de esas reglas.
- UI: vista "Moderación" en el menú izquierdo, con pestañas Seguidores / No
  seguidores sobre la misma tabla.

## Telemetría (`telemetria/`)

Dominio aparte que reporta uso agregado y anónimo a un servicio propio
(`telemetria-tts`, repo separado, self-hosted en Docker — no Vercel). Sin
`TELEMETRY_URL` configurada, el módulo es un no-op: cero peticiones de red.

- `telemetria/index.js` — dominio registrado normal (`register({bus, logger})`):
  engancha los conectores al bus de inmediato, aunque `runtime.init()` todavía
  no haya corrido (`track()` es no-op mientras no esté habilitada).
- `telemetria/runtime.js` — el ciclo de vida real (`init`, `track`, `flush`,
  `shutdown`). Separado de `index.js` porque `init()` necesita datos que solo
  Electron tiene (`app.getVersion()`, `app.getPath('userData')`) — lo llama
  `main.js` tras `waitForServer`.
- `telemetria/transport.js` — envía batches por `fetch` nativo a
  `TELEMETRY_URL` (o al `url` de `telemetry.json`), con cola en disco
  (`telemetria/buffer.js`) y reintentos. 4xx ya no se trata como éxito
  silencioso: todo fallo de red queda logueado (`telemetria.envio.*`).
- `telemetria/connectors/*.js` — un conector por área (creators, platforms,
  counters, obs, mobile, overlays, updates, errors, settings). Cada uno
  escucha el bus de dominios (`canal:estado`, `movil:comando`, etc.) o el
  espejo de logs (`core/logger.js` emite **todo** log como `log:entry` al
  bus) en vez de que cada dominio de negocio tenga que conocer telemetría.
  `counters.js` agrega eventos de alta frecuencia (TTS, música, moderación)
  en un contador por latido de 5 min en vez de uno por mensaje.
- La URL sale de `TELEMETRY_URL` (env, inyectada en build) o de
  `%APPDATA%\tiktok-live-tts\telemetry.json` — archivo separado de
  `config.json` a propósito, porque `configuracion/` descarta claves que no
  reconoce y lo borraría en el primer guardado.
- Casi todos los eventos se emiten directo desde los conectores. Solo
  `tts:skipped` y `tts:queue-overflow` nacen en el renderer (`interfaz/src/nucleo/tts/cola-tts.js`)
  y llegan al bus vía IPC:
  `window.electronAPI.trackEvent(name)` → `preload.js` → `ipcMain.on('telemetry:track', ...)`
  en `electron-shell/ipc-bridge.js`, con lista blanca de esos dos nombres.

## Variables de entorno clave

- `TIKTOK_RESOURCES_PATH` — set por `main.js` en modo packaged para que `core/paths.js` (`RESOURCE_BASE`) resuelva `gifts/`, `public/` (output empaquetado de `interfaz/dist/`, ver extraResources), `asset/`, `lang-words/`, `blocked-words.md` en `process.resourcesPath` (fuera del asar)
- `TIKTOK_USER_DATA_PATH` — set por `main.js` a `app.getPath('userData')`; `core/paths.js` (`DATA_BASE`) lo usa para `config.json`, `moderation.json`, `logs/`, etc.

## Paths críticos en producción (packaged)

```
%LOCALAPPDATA%\TikTok TTS\
  TikTok TTS.exe
  resources\
    app.asar              ← main.js + server.js + los 17 dominios + electron-shell/ + telemetria/ + node_modules (interfaz/ fuente NO viaja, solo su build)
    gifts\                ← 810 PNGs de regalos TikTok (188 MB)
    public\               ← output de `vite build` (interfaz/dist/), vía extraResources — HTML/CSS/JS de la UI, overlays y estaticos (icons/flags/locales/vendor/plugin-store)
    asset\                ← flags SVG, iconos (fuente para asset/icons/, catalogo Material Icons)
    lang-words\           ← diccionarios de frecuencia por idioma (filtro dictFilterEnabled, `idioma/lang-dicts.js`)
    blocked-words.md      ← palabras bloqueadas (r/w en runtime)
    tray-icon.ico
    public\uploads\       ← imágenes subidas por usuario (r/w)
```

## Flujo de build y release

```bash
# Desarrollo local
npm run electron          # abre app en dev mode (sin packager)
npm run dev               # solo el servidor Node.js (sin Electron)

# Release
# 1. Editar version en package.json (ej: "1.0.3")
# 2. Commitear cambios
git tag v1.0.3
git push origin main --tags
# → GitHub Actions (windows-latest) compila NSIS installer
# → sube a GitHub Releases como draft
# → publicar manualmente con: gh release edit v1.0.3 --draft=false
```

## GitHub Actions (.github/workflows/release.yml)

- Trigger: push de tag `v*`
- Runner: `windows-latest` (requerido para NSIS sin wine)
- Permisos: `contents: write` para publicar release
- Sin firma de código (`CSC_IDENTITY_AUTO_DISCOVERY=false`)
- electron-builder publica automáticamente con `--publish always`

## Auto-update

`electron-updater` chequea `https://github.com/iKhunsa/tiktok-tts/releases/latest/download/latest.yml` al arrancar. Si hay versión nueva → descarga en background → diálogo "Instalar ahora / Después" → `autoUpdater.quitAndInstall()`. Solo activo en modo packaged (`app.isPackaged`).

## i18n de la UI — obligatorio para todo texto nuevo visible al usuario

La app tiene un sistema de traducción funcionando en 10 idiomas
(`es, en, it, pt, fr, de, zh, ja, ko, ru`). **Cualquier código nuevo (o
modificado) que agregue texto visible al usuario final tiene que pasar por
este sistema — nunca hardcodear un string en español (ni en ningún idioma)
directo en HTML/JS/backend.**

- Frontend (`interfaz/`): función única `t(key, vars)` en
  `interfaz/src/nucleo/i18n/i18n.js` (`index.html`/`advanced.html`/`mobile.html`)
  y su espejo `interfaz/compartido/i18n-overlay.js` para los 7 overlays vanilla
  de OBS — ya no hay copy-paste por archivo (`fase-01`/`fase-03`/`fase-04`
  del rebuild del frontend lo unificaron). Objeto `_locale` cargado desde
  `fetch('/locales/${lang}.json')` (fallback a `es.json`). Interpolación de
  variables con `{var}` dentro del string.
  - Markup estático → atributo `data-i18n="seccion.clave"` (aplica a
    `textContent`), `data-i18n-html` (a `innerHTML`), `data-i18n-placeholder`
    (a `placeholder`). `advanced.html` además soporta `data-i18n-title`.
  - Texto armado en JS → `t('seccion.clave', { var: valor })`, nunca template
    literal con la frase en español embebida.
  - Idioma elegido persiste en `localStorage['tikliveTTS_lang']` — no hay
    equivalente server-side, es puramente client-side.
- Diccionario: `interfaz/publico/locales/{es,en,it,pt,fr,de,zh,ja,ko,ru}.json`
  (Vite `publicDir` — se copian tal cual a `interfaz/dist/locales/` al buildear).
  **`es.json` es la fuente de verdad** — agregar la clave ahí primero, después
  propagar la traducción a los otros 9 (no dejar ningún idioma sin la clave
  nueva; la paridad de claves entre los 10 archivos es lo que se valida).
  Nombrar las claves seccion.claveDescriptiva, reusando una sección existente
  cuando el texto encaja ahí (`toast.*`, `conn.*`, `overlayStr.*`, etc.) en vez
  de crear secciones nuevas sin necesidad.
- Backend: si una ruta HTTP devuelve un mensaje de error que el frontend
  muestra al usuario (`res.status(N).json({ error: '...' })` seguido en el
  cliente por un `showToast(data.error...)` o similar), sumarle también
  `errorKey: 'errors.claveDescriptiva'` — nunca reemplazar `error` (mantiene
  compat con builds viejos), solo agregar la clave. El frontend prefiere
  `errorKey` traducido vía el helper `tErr(data, fallbackKey)` (definido
  junto a `t()` en `index.html` y `advanced.html`) y cae al texto crudo si no
  hay `errorKey` o no resuelve.
- Excepciones legítimas — no traducir: nombres de marca/plataforma
  (`TIKTOK`, `TWITCH`, `YOUTUBE`, `BITS`, `RAID`, `SUPERCHAT`), `<title>` de
  los overlays (solo los ve el streamer armando OBS, nunca el espectador),
  contenido dinámico que viene del usuario (nombre de usuario, texto del
  chat).
- `core/announce-texts.js` (avisos TTS de admin/promo) y `idioma/` (filtro de
  idioma/script de voz) son sistemas **aparte**, ya cubren sus propios
  idiomas — no tocar ni confundir con el i18n de UI de arriba.
- Antes de dar por terminada una función con texto nuevo: correr un
  script rápido que cuente claves hoja de los 10 JSON y confirme que
  coinciden en cantidad — un idioma con menos claves que el resto es señal
  de que faltó propagar algo.

## Íconos — nunca emojis en UI nueva

Los emojis que ya están en el código (`🎁`, `💾`, `🔴`, etc.) se quedan tal
cual — no hay que salir a limpiarlos. Pero **de acá en adelante, código
nuevo o modificado nunca usa emoji como ícono de UI** (botones, labels,
badges, títulos de card). En su lugar:

1. Buscar el ícono que mejor encaje en `asset/icons/` (catálogo Material
   Icons completo, ~1300 SVGs — es solo fuente, la app no lo sirve).
2. Copiarlo a `interfaz/publico/icons/` (Vite `publicDir` — se copia tal cual
   a `interfaz/dist/icons/`, que sí sirve Express; el HTML lo referencia
   como `icons/nombre.svg`, con `class="icon-inline"`).
3. Usarlo con `<img class="icon-inline" src="icons/nombre.svg" alt="">`,
   mismo patrón que el resto de la app.

Los SVG de `asset/icons/` vienen en un solo color (negro/currentColor). Si
el ícono necesita otro color para calzar con el diseño (ej. un ícono de
estado en rojo/verde), está permitido copiarlo con otro nombre y editar el
`fill`/`stroke` directo en el XML del SVG — son archivos de texto planos,
no binarios, se editan igual que cualquier código.

## Funcionalidades actuales

- TTS en 13 idiomas via Google Translate (es, es-MX, es-AR, en, en-GB, pt, pt-PT, fr, de, it, ja, zh-CN, ru, ko)
- Chat multi-plataforma: TikTok Live + Twitch (tmi.js) + YouTube (youtube-chat, requiere stream activo) + Kick (API + Pusher WS)
- Badge de plataforma en cada mensaje del chat (tiktok / twitch / youtube)
- Cola TTS ordenada por timestamp: mensajes de 3 plataformas simultáneas se leen en orden cronológico real
- Un solo narrador (1 Audio activo a la vez, cola serializada con `isSpeaking` flag)
- Filtro de spam (mensajes repetidos, muy largos, palabras bloqueadas)
- Rate limiting configurable en runtime
- Debounce de likes (agrupa likes del mismo usuario en ventana de 1.5s)
- Auto-reconexión con backoff exponencial (máx 5 intentos)
- Overlays: alertas de regalos, contador de likes, contador de seguidores
- Subida de imagen de fondo para overlays (PNG/JPG/WebP/GIF, máx 8MB)
- Top likers tracking durante el stream
- Refresco de follower count cada 5 minutos
- Palabras bloqueadas persistidas en `blocked-words.md`
- Single-instance lock (doble clic → bring to front)
- Atajo global Ctrl+Shift+M → marca clip en OBS

## Roadmap / Pendiente

- [ ] Firma de código del installer (elimina warning de Windows Defender, ~$300-500/año)
- [ ] Modo sin conexión parcial (TTS cacheado para frases comunes)
- [ ] Soporte multi-cuenta / multi-stream simultáneo
- [ ] Personalización de voces TTS (pitch, velocidad)
- [ ] Estadísticas del stream (resumen al desconectar)
- [ ] Hotkeys globales (mute TTS, skip mensaje)
- [ ] Integración con Streamlabs / Stream Deck
- [ ] Notificaciones de desktop para eventos importantes
- [ ] Modo oscuro / temas de UI
- [ ] Log exportable del chat

## Decisiones técnicas importantes

**Por qué Electron y no pkg:** pkg no puede mostrar UI nativa. El usuario quería que todo estuviera dentro del exe, sin abrir el navegador externo. Electron embebe Chromium y sirve la UI internamente.

**Por qué no se firma el código:** Requiere certificado de firma (~$300-500/año). Windows Defender mostrará warning en la primera instalación ("Windows protegió tu PC"). El usuario puede hacer clic en "Más información → Ejecutar de todas formas".

**Por qué Google TTS y no Web Speech API:** Web Speech API requiere que la pestaña del navegador esté activa y en primer plano. Google TTS corre en el servidor y funciona aunque la ventana esté minimizada.

**Por qué extraResources y no asar:** `gifts/` tiene 188 MB de PNGs. Meterlos en el asar los haría parte del bundle comprimido pero el asar tiene límites prácticos de tamaño y acceso. `extraResources` los deja en el sistema de archivos real, accesibles via `process.resourcesPath`.

**Secrets embebidos en el instalador (webhook Discord, token telemetría) — riesgo aceptado:**
`webhook-config.generated.json` / `telemetry-config.generated.json` se inyectan
en build time (desde secrets de CI) y viajan dentro de `extraResources` —
extraíbles por cualquiera que descompacte el instalador. Se evaluó moverlos
detrás de un proxy/backend propio y se descartó: agrega infraestructura
hosteada 24/7 solo para ocultar un webhook de baja severidad (spam de bug
reports, no acceso a datos de usuarios). Mitigación real: rotación barata.
Si se filtra el webhook — regenerar en Discord (Server Settings → Integrations
→ Webhooks), actualizar el secret `DISCORD_BUG_REPORT_WEBHOOK` en GitHub
Actions, cortar un nuevo release (`git tag vX.Y.Z && git push --tags`); el
build viejo filtrado queda inútil apenas se rota. Igual para el token de
telemetría vía `TELEMETRY_URL`/su secret correspondiente.

**Kick — conexión directa desde Node (2026-08):** el bloqueo de Cloudflare que
antes forzaba descartar Kick ya no aplica a `https://kick.com/api/v2/channels/{slug}`
(responde 200 a Node sin headers especiales). El chat va por Pusher público
(`wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679`, cluster us2, canal
`chatrooms.{chatroom_id}.v2`, sin auth). `canales/kick/`:
`fetch-chatroom.js` (slug → chatroom.id) + `pusher.js` (URL/frames) +
`connect-kick.js` (WS + subscribe + dedup + watchdog + backoff, mismo patrón
que YouTube) + `handle-event.js` (parse del `ChatMessageEvent`). **No usa
Electron** — funciona igual en `node server.js` que empaquetado. Los emotes
llegan como `[emote:ID:nombre]` dentro de `content` y los expande
`chat/emit-chat-message.js#extractKickMessage` a `:nombre:` +
`https://files.kick.com/emotes/{id}/fullsize` (los globales/7TV que Kick manda
como texto plano no se resuelven, igual que en Twitch/YT). Si Kick vuelve a
cerrar la API con Cloudflare, el único punto a parchear es `fetch-chatroom.js`
(proxy propio o ventana Electron). El watchdog (`stale-watchdog.js`, 5 min sin
mensajes → `canales.kick.sin_eventos` + reconexión) es la red de seguridad.

**bufferutil/utf-8-validate:** Dependencias opcionales de `ws`. Se incluyen en el build con sus binarios precompilados para Node.js (NAPI, compatibles con Electron sin rebuilding). Se excluyen solo los `.pdb` (debug symbols, innecesarios en producción).

**Cola TTS timestamp-ordered:** `speechQueue` en el cliente almacena `{ text, msgId, timestamp }`. Al agregar cada mensaje, el array se re-ordena por `timestamp` ascendente. Esto garantiza que si Twitch, YouTube y TikTok envían mensajes casi simultáneos, se lean en el orden real en que los usuarios los escribieron (según el timestamp del servidor que recibió cada evento).

## Frontend modular (`interfaz/`)

Rebuild completo del frontend (mismo patron que el rebuild por dominios del
backend, ver "Documentación del rebuild"): HTML monolitico → modulos ESM en
`interfaz/`, siguiendo **la misma regla de modularidad del backend**: un
archivo `.js` por funcion/responsabilidad. Si una responsabilidad necesita
mas de un archivo (estado + helpers), se agrupa en una carpeta con su
propio `index.js` que la expone. El `public/` legado ya no existe en el
repo (fase-06) — `interfaz/dist/` (build de Vite) es la unica raiz estatica
que sirve `core/app.js`.

```
interfaz/
  index.html  advanced.html  mobile.html  overlay-*.html   ← entries de Vite
  src/
    nucleo/          ← framework-agnostic: ws/, estado/, i18n/, tts/, log-storage.js
    componentes/      ← toast, campos de formulario reutilizables
    vistas/
      principal/       ← index.html (~30 modulos, orquestador en index.js)
      avanzada/         ← advanced.html
      movil/            ← mobile.html (panel remoto)
  compartido/        ← consumido ademas por los 7 overlays vanilla de OBS
  publico/           ← Vite publicDir: icons/, flags/, locales/, vendor/,
                         plugin-store/, img/, asset/, logos, favicon —
                         se copian tal cual a dist/, sin procesar
  dist/              ← generado (gitignored), output de `vite build`
```

- **Nomenclatura**: carpetas de dominio/vista en kebab-case **español**
  (espejo de las carpetas de dominio del backend); nombres de archivo en
  kebab-case **ingles** describiendo la funcion que exportan
  (`cliente-ws.js` → `conectarWS`), igual que en el backend.
- **CommonJS en el backend, ESM (`import`/`export`) en el frontend** — es la
  unica diferencia de convencion, porque el frontend corre en el navegador/
  Chromium vía Vite y el backend en Node. Excepcion: `interfaz/publico/plugin-store/`
  y `interfaz/publico/vendor/` son scripts clasicos (`<script src>`, sin
  modulos) que Vite copia a `dist/` sin tocar — `eslint.config.js` los
  lintea con `sourceType: 'script'` aparte del resto de `interfaz/`.
- `interfaz/src/nucleo/` (estado, WS, i18n, cola TTS) es framework-agnostic
  y no depende de ninguna vista; las vistas no se importan entre si, solo
  consumen `nucleo/` y `componentes/`.
- Bundler: Vite multi-entry (`interfaz/vite.config.js`), `publicDir: interfaz/publico`.
- Sin framework de UI (no React): el estado vive en un mini-store propio
  (`crearAlmacen`, sin dependencias externas) y las vistas dinamicas usan
  helpers de render dirigido en `interfaz/src/render/`.
- `gifts/`, `sounds/`, `asset/` (fuente de iconos) y `lang-words/` (diccionarios
  del filtro de idioma) siguen en la raiz del repo, fuera de `interfaz/` —
  son recursos que lee el **backend** por filesystem (`RESOURCE_BASE`), no
  estaticos servidos al cliente; no confundir con `interfaz/publico/`.

## Repositorio

- GitHub: https://github.com/iKhunsa/tiktok-tts
- Releases: https://github.com/iKhunsa/tiktok-tts/releases

## Documentación del rebuild por dominios

El backend actual es el resultado de un rebuild completo ejecutado en 14
fases (Fase 0 a Fase 13). Documentos de diseño y ejecución, útiles como
referencia histórica y para entender decisiones de arquitectura:

- `plan-fases/00-EJECUCION-PROMPTS.md` — prompts usados para ejecutar cada fase.
- `plan-fases/fase-NN-*.md` — spec de cada fase (alcance, contratos, criterios de aceptación).
- `arquitectura-propuesta.md` — documento de diseño de la arquitectura por dominios.
- `logging-errores-propuesta.md` — spec de logging (esquema de evento, eventos por dominio).
- `mapa-funciones-actual.md` — inventario función-por-función del backend monolítico original (usado como checklist de paridad en la Fase 13 de cierre).
