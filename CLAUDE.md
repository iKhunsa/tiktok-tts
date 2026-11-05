# TikLiveTTS — Contexto del Proyecto para IA

## Qué es

App de escritorio Electron que lee en voz alta el chat de TikTok Live, Twitch, YouTube y Kick en tiempo real. Diseñada para streamers que quieren TTS integrado sin depender de herramientas externas. La UI corre dentro de la app (no en navegador externo). Los overlays (alertas, likes, seguidores) se pegan en OBS como Browser Source via `http://localhost:3000/overlay-*.html`.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Desktop shell | Electron 41 |
| Backend | Express + WebSocket (ws) en el mismo proceso Electron |
| Plataformas | TikTok, Twitch (tmi.js), YouTube (youtube-chat), Kick (API + Centrifugo WS) |
| TTS | Google Translate TTS API (google-tts-api, online) |
| Auto-update | electron-updater → GitHub Releases |
| Build/CI | electron-builder + GitHub Actions (windows-latest) |
| Distribución | NSIS installer via GitHub Releases, sin firma de código |

## Reglas críticas

**Modularidad:** Backend dividido por dominios bajo `features/`; fronted modularizado en `interfaz/`. Ver `/docs/ARQUITECTURA.md` y `/docs/MODULARIDAD.md` para la estructura completa. Un archivo por función; antes de copiar código, grep para reusar.

**i18n:** 10 idiomas (es, en, it, pt, fr, de, zh, ja, ko, ru). Nunca hardcodear strings; usar `t(key, vars)` en frontend o `data-i18n` en markup. Ver `/docs/FRONTEND.md`.

**Iconografía:** Nunca emojis en UI nueva. Material Icons en `asset/icons/` → copiar a `interfaz/publico/icons/` → usar con `<img class="icon-inline" src="icons/nombre.svg" alt="">`. Ver `/docs/FRONTEND.md`.

## Documentación

| Área | Doc |
|------|-----|
| Backend, dominios, modularidad | [`/docs/ARQUITECTURA-MODULARIDAD.md`](/docs/ARQUITECTURA-MODULARIDAD.md) |
| Moderación, Telemetría, MCP, Overlays | [`/docs/FEATURES-ESPECIALES.md`](/docs/FEATURES-ESPECIALES.md) |
| Frontend, i18n, UX, Build, Release | [`/docs/FRONTEND-BUILD.md`](/docs/FRONTEND-BUILD.md) |

## Funcionalidades actuales

- TTS en 13 idiomas via Google Translate (es, es-MX, es-AR, en, en-GB, pt, pt-PT, fr, de, it, ja, zh-CN, ru, ko)
- Chat multi-plataforma: TikTok Live + Twitch (tmi.js) + YouTube (youtube-chat) + Kick (API + Centrifugo WS)
- Cola TTS ordenada por timestamp (mensajes de 4 plataformas en orden cronológico real)
- Filtro de spam (palabras bloqueadas, mensajes largos, repetidos)
- Moderación local por usuario (mute/ban, solo en app, no en plataformas)
- Rust Chat Guard (segunda capa de contenido, detección por IA)
- Overlays: alertas de regalos, contador de likes, top likers, top donadores
- Panel remoto (móvil: espejo de estado + comandos)
- Bot musical (yt-dlp, soundpad)
- Detectores de comandos (!p, !skip, etc.)
- Auto-reconexión con backoff exponencial
- Single-instance lock (doble clic → bring to front)
- Atajo global Ctrl+Shift+M → marca clip en OBS

## Datos por cuenta

Todo dato del streamer se guarda por `user.id`:
- Renderer: `interfaz/src/nucleo/estado/datos-por-cuenta.js`
- Backend: `core/account-data-path.js`

Sin sesión se usa `anonymous`; nunca reutilizar claves/rutas globales para datos de cuenta. Los datos de instalación (sesión, telemetría, logs, binarios) permanecen en `DATA_BASE`.

La transición se anuncia como `account:changing` (flush y desconexión) y `account:changed` (contexto y recarga). `config.json`, `moderation.json`, soundpad y cache de telemetría son por cuenta; `installation-config.json` conserva globales.

## graphify

Este proyecto tiene un knowledge graph en `graphify-out/` con nodos, estructura de comunidades y relaciones entre archivos.

**Reglas:**
- SIEMPRE lee `graphify-out/GRAPH_REPORT.md` antes de leer archivos fuente o responder preguntas del codebase
- SI `graphify-out/wiki/index.md` existe, navégalo en lugar de leer archivos raw
- Para preguntas "cómo se relacionan X e Y", prefiere `graphify query`, `graphify path`, `graphify explain` sobre grep
- Tras modificar código, ejecuta `graphify update .` para mantener el graph actualizado

## Notas de parche (bitácora de cambios por versión)

- Las notas se escriben en `NOTAS-PARCHE-<version>.md` (raíz del repo)
- **Nunca escribir por iniciativa propia**: solo cuando el usuario dé la señal
- Al recibirla, mostrar el texto exacto que se va a agregar y esperar aprobación; recién entonces escribirlo
- Una vez aprobada, redactar la misma nota también en las notas de la app (modal de Novedades): `CHANGELOG.md` (español, fuente) y sus traducciones en `changelog/<idioma>.md`
- Cuando el usuario publique el release público, preguntarle cuál es la próxima versión y renombrar el md accordingly

## Funcionalidades actuales

- TTS en 13 idiomas via Google Translate (es, es-MX, es-AR, en, en-GB, pt, pt-PT, fr, de, it, ja, zh-CN, ru, ko)
- Chat multi-plataforma: TikTok Live + Twitch (tmi.js) + YouTube (youtube-chat, requiere stream activo) + Kick (API + Centrifugo WS)
- Badge de plataforma en cada mensaje del chat (tiktok / twitch / youtube)
- Cola TTS ordenada por timestamp: mensajes de 3 plataformas simultáneas se leen en orden cronológico real
- Un solo narrador (1 Audio activo a la vez, cola serializada con `isSpeaking` flag)
- Filtro de spam (mensajes repetidos, muy largos, palabras bloqueadas)
- Rate limiting configurable en runtime
- Debounce de likes (agrupa likes del mismo usuario en ventana de 1.5s)
- Auto-reconexión con backoff exponencial (máx 5 intentos)
- Overlays: alertas de regalos, contador de likes, contador de seguidores
- Top likers tracking durante el stream
- Refresco de follower count cada 5 minutos
- Palabras bloqueadas persistidas por cuenta en `blocked-words.json` (migra una vez el `blocked-words.md` legado sin borrarlo)
- Single-instance lock (doble clic → bring to front)
- Atajo global Ctrl+Shift+M → marca clip en OBS

## Roadmap / Pendiente

- [ ] Firma de código del installer (elimina warning de Windows Defender, ~$300-500/año)
- [~] Modo sin conexión parcial (TTS cacheado para frases comunes) — cache en
  disco ya hecho (`features/sonido/tts/fetch-audio.js`); falta un set precacheado
  de frases comunes que viaje en el build
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

**Resiliencia del TTS (`features/sonido/tts/fetch-audio.js`):** Google Translate
TTS es el endpoint gratis sin API key; rate-limitea el IP devolviendo `200` +
body vacío. `fetch-audio.js` mete 3 capas: **cache** en disco
(`DATA_BASE/tts-cache/`, clave `sha1(lang|slow|text)`, poda a 450 archivos al
pasar de 600) — frases repetidas (saludos, nombres de regalos, nicks) salen del
archivo sin tocar Google; **retry** (hasta 2 reintentos ante body vacío / red /
timeout, no ante 4xx); **backoff** de módulo (3 fallos seguidos → pausa
5s→15s→60s, mientras falla rápido sin red; un éxito resetea). `generate.js`
bufferea la respuesta (ya no `pipe`) y mapea el `code` de fallo a HTTP (`503` en
backoff con `retryAfter`, `502` el resto). El warn `sonido.tts.respuesta_pequena`
**ya no** se promueve a issue de GlitchTip (queda en la sección Logs) — era ruido
en cada blip de rate-limit.

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
(responde 200 a Node sin headers especiales). El chat va por el Centrifugo
propio de Kick (2026-10; antes era Pusher `32cbd69e…`, Kick dio de baja esa app
y responde `4001 App key not in this cluster`). Handshake sin login:
`POST web.kick.com/api/v1/realtime/channels/{channelId}/chat/connection` → URL
del WS; `POST /v1/realtime/auth/connection {client_id}` → token de invitado
(caduca ~45 min, se renueva con el MISMO client_id vía comando `refresh`).
Canal `chatrooms.{chatroom_id}.v2`, mismo payload `ChatMessageEvent` que Pusher.
`features/canales/kick/`: `fetch-chatroom.js` (slug → chatroom.id/channel_id) +
`fetch-realtime-session.js` (URL + token) + `centrifugo.js` (frames) +
`connect-kick.js` (WS + subscribe + dedup + watchdog + backoff, mismo patrón
que YouTube) + `handle-event.js` (parse del `ChatMessageEvent`). **No usa
Electron** — funciona igual en `node server.js` que empaquetado. Los emotes
llegan como `[emote:ID:nombre]` dentro de `content` y los expande
`features/chat/emit-chat-message.js#extractKickMessage` a `:nombre:` +
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
`interfaz/`, siguiendo **la misma regla de modularidad del backend** (ver
sección "Regla de modularidad" arriba — incluye el "antes reusar"). El
`public/` legado ya no existe en el
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

## Datos por cuenta

Todo dato del streamer se guarda por `user.id`: renderer mediante
`interfaz/src/nucleo/estado/datos-por-cuenta.js` y proceso principal mediante
`core/account-data-path.js`. Sin sesión se usa `anonymous`; nunca reutilizar
claves/rutas globales para datos de cuenta. Los datos de instalación (sesión,
telemetría, logs y binarios) permanecen en `DATA_BASE`.

La transición se anuncia como `account:changing` (flush y desconexión) y
`account:changed` (contexto y recarga). Los dominios no importan auth: escuchan
ese bus. `config.json`, `moderation.json`, soundpad, PortalView y la
cache de identidad de telemetría son por cuenta; `installation-config.json`
conserva globales `subscriptionsEnabled` y los flags MCP. El renderer recarga
la ventana tras un cambio efectivo de `user.id`, para no reutilizar caches,
cola TTS ni estado visual de la cuenta anterior.

## graphify


This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Notas de parche (bitácora de cambios por versión)

- Las notas se escriben en `NOTAS-PARCHE-1.11.2.md` (raíz del repo). **Nunca escribir ahí por iniciativa propia**: solo cuando el usuario dé la señal. Al recibirla, primero mostrarle el texto exacto que se va a agregar y esperar su aprobación; recién entonces escribirlo.
- Una vez aprobada, la misma nota se redacta **también en las notas de la app** (modal de Novedades): `CHANGELOG.md` (español, fuente) y su traducción en los 9 `changelog/<idioma>.md` (`en, pt, it, fr, de, ru, zh, ja, ko`), en la sección equivalente de la versión en curso. Solo lo visible para el usuario; lo de «Interno» no va a la app.
- Cuando el usuario publique el release público de esa versión, **preguntarle cuál es la próxima versión** y renombrar el md a `NOTAS-PARCHE-<próxima-versión>.md`. A partir de ahí, anotar ahí todo lo que se haga en las siguientes versiones, y repetir el ciclo en cada release público.
