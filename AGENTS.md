# TikLiveTTS — Contexto del Proyecto para IA

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
| TTS | Google Translate TTS API (google-tts-api, online) |
| Auto-update | electron-updater → GitHub Releases |
| Build/CI | electron-builder + GitHub Actions (windows-latest) |
| Distribución | NSIS installer via GitHub Releases, sin firma de código |

## Arquitectura

```
main.js (Electron main process)
  ├── require('./server.js')   ← Express + WS arranca aquí
  ├── BrowserWindow           ← carga http://localhost:3000
  ├── Tray                    ← ícono bandeja, menu open/exit
  └── autoUpdater             ← chequea GitHub Releases al init

server.js (Express en puerto 3000)
  ├── GET  /                       ← index.html (UI principal)
  ├── GET  /advanced.html          ← configuración avanzada
  ├── GET  /overlay-*.html         ← overlays para OBS
  ├── POST /api/connect            ← conecta a TikTok Live
  ├── POST /api/tts                ← Google TTS → stream MP3
  ├── WS   /                       ← broadcast eventos al browser
  ├── GET  /api/gifts-list         ← lista PNGs de regalos
  ├── PATCH /api/config            ← ajusta config en runtime
  ├── GET  /api/platforms/status   ← estado twitch/youtube
  ├── POST /api/platforms/connect  ← conecta twitch o youtube
  └── POST /api/platforms/disconnect
```

## Variables de entorno clave

- `TIKTOK_RESOURCES_PATH` — set por `main.js` en modo packaged para que `server.js` encuentre `gifts/`, `public/` (output empaquetado de `interfaz/dist/`), `asset/`, `lang-words/`, `blocked-words.md` en `process.resourcesPath` (fuera del asar)
- `IS_PKG` — legado del approach anterior con pkg (aún presente en server.js, no afecta Electron)

## Paths críticos en producción (packaged)

```
%LOCALAPPDATA%\TikLiveTTS\
  TikLiveTTS.exe
  resources\
    app.asar              ← main.js + server.js + node_modules
    gifts\                ← 810 PNGs de regalos TikTok (188 MB)
    public\               ← HTML/CSS/JS de la UI y overlays
    asset\                ← flags SVG, iconos
    blocked-words.md      ← palabras bloqueadas (r/w en runtime)
    tray-icon.ico
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

## Funcionalidades actuales

- TTS en 13 idiomas via Google Translate (es, es-MX, es-AR, en, en-GB, pt, pt-PT, fr, de, it, ja, zh-CN, ru, ko)
- Chat multi-plataforma: TikTok Live + Twitch (tmi.js) + YouTube (youtube-chat, requiere stream activo)
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

**Por qué se descartó Kick:** Kick.com usa Cloudflare que bloquea cualquier request HTTP/WS desde Node.js (403). Requeriría mantener un BrowserWindow de Electron abierto permanentemente (~200MB RAM), y su infraestructura WS cambió de Pusher a `websockets.kick.com` con tokens dinámicos. Complejidad vs beneficio no justificada actualmente.

**bufferutil/utf-8-validate:** Dependencias opcionales de `ws`. Se incluyen en el build con sus binarios precompilados para Node.js (NAPI, compatibles con Electron sin rebuilding). Se excluyen solo los `.pdb` (debug symbols, innecesarios en producción).

**Cola TTS timestamp-ordered:** `speechQueue` en el cliente almacena `{ text, msgId, timestamp }`. Al agregar cada mensaje, el array se re-ordena por `timestamp` ascendente. Esto garantiza que si Twitch, YouTube y TikTok envían mensajes casi simultáneos, se lean en el orden real en que los usuarios los escribieron (según el timestamp del servidor que recibió cada evento).

## graphify — mapa del codebase, leerlo antes de explorar

Este proyecto tiene un grafo de conocimiento generado en `graphify-out/` (god
nodes, estructura de comunidades, relaciones cross-file).

Reglas:
- SIEMPRE leer `graphify-out/GRAPH_REPORT.md` antes de leer archivos fuente,
  correr grep/glob, o responder preguntas sobre el codebase. El grafo es el
  mapa primario, no un archivo más.
- Si existe `graphify-out/wiki/index.md`, navegar ese índice en vez de leer
  archivos crudos directamente.
- Para preguntas cross-módulo ("cómo se relaciona X con Y"), preferir
  `graphify query "<pregunta>"`, `graphify path "<A>" "<B>"`, o
  `graphify explain "<concepto>"` (CLI) antes que grep — recorren las
  relaciones EXTRACTED + INFERRED del grafo en vez de escanear archivos.
- Si `graphify-out/` no existe todavía en el momento de la tarea, explorar
  normalmente (grep/glob/lectura directa) — esta regla aplica solo cuando el
  grafo ya está generado.

## Modo lazy / anti-over-engineering (equivalente a "ponytail" de Claude Code)

Actuá como un dev senior lazy: lazy significa eficiente, no descuidado. Antes
de escribir código nuevo, subí esta escalera y parate en el primer escalón
que resuelva el problema:

1. **¿Hace falta que esto exista?** Necesidad especulativa = no lo escribas,
   decilo en una línea (YAGNI).
2. **¿Ya existe en este codebase?** Un helper, util, tipo o patrón que ya vive
   acá → reusalo. Buscar antes de escribir es la regla — reimplementar algo
   que está a unos archivos de distancia es el error más común.
3. **¿La stdlib de Node/el navegador ya lo resuelve?** Usala.
4. **¿Una feature nativa de la plataforma lo cubre?** CSS en vez de JS,
   constraint de DB en vez de código de app, `<input type="date">` en vez de
   un picker propio.
5. **¿Una dependencia ya instalada lo resuelve?** Usala. Nunca agregues una
   dependencia nueva para lo que unas líneas ya hacen.
6. **¿Se puede en una línea?** Una línea.
7. **Recién ahí:** el mínimo código que funcione.

Reglas duras:
- Nada de abstracciones no pedidas: sin interface con una sola
  implementación, sin factory para un solo producto, sin config para un valor
  que nunca cambia.
- Sin boilerplate ni scaffolding "para después" — después se scaffoldea solo.
- Menos código gana sobre más código. Aburrido y directo gana sobre
  ingenioso — lo ingenioso es lo que alguien tiene que descifrar a las 3am.
- El diff más corto que funcione gana — pero solo después de entender el
  problema. Trazá el flujo completo (todos los archivos que la tarea toca)
  antes de elegir el escalón de la escalera. El diff mínimo en el lugar
  equivocado no es lazy, es un segundo bug.
- **Bug = causa raíz, no síntoma.** Un reporte nombra un síntoma. Antes de
  editar, buscá todos los callers de la función que vas a tocar. El fix lazy
  ES el fix de causa raíz: un guard en la función compartida es un diff más
  chico que un guard en cada caller, y parchear solo el path que el ticket
  nombra deja a cada caller hermano igual de roto.
- Simplificación deliberada que corta una esquina real con techo conocido
  (lock global, scan O(n²), heurística naive) → marcarla con un comentario
  que nombre el techo y el camino de upgrade (`// lazy: lock global, locks
  por cuenta si el throughput importa`).

Nunca simplifiques: validación de input en boundaries de confianza, manejo de
errores que evita pérdida de datos, medidas de seguridad, nada explícitamente
pedido por el usuario. Si el usuario insiste en la versión completa, se
construye, sin volver a discutirlo.

Esto no reemplaza las reglas de modularidad, i18n, íconos y skills de diseño
que ya están en el resto de este documento — son reglas duras del proyecto,
no negociables por "lazy".

## Repositorio

- GitHub: https://github.com/iKhunsa/tiktok-tts
- Releases: https://github.com/iKhunsa/tiktok-tts/releases
