# TikTok TTS — Contexto del Proyecto para IA

## Qué es

App de escritorio Electron que lee en voz alta el chat de TikTok Live en tiempo real. Está diseñada para streamers que quieren TTS integrado sin depender de herramientas externas. La UI corre dentro de la app (no en navegador externo). Los overlays (alertas, likes, seguidores) se pegan en OBS como Browser Source via `http://localhost:3000/overlay-*.html`.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Desktop shell | Electron 41 |
| Backend | Express + WebSocket (ws) en el mismo proceso Electron |
| TikTok connection | tiktok-live-connector (WebSocket scraping) |
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
  ├── GET  /                  ← index.html (UI principal)
  ├── GET  /advanced.html     ← configuración avanzada
  ├── GET  /overlay-*.html    ← overlays para OBS
  ├── POST /api/connect       ← conecta a TikTok Live
  ├── POST /api/tts           ← Google TTS → stream MP3
  ├── WS   /                  ← broadcast eventos al browser
  ├── GET  /api/gifts-list    ← lista PNGs de regalos
  ├── POST /api/upload-bg     ← sube imagen fondo overlay
  └── PATCH /api/config       ← ajusta config en runtime
```

## Variables de entorno clave

- `TIKTOK_RESOURCES_PATH` — set por `main.js` en modo packaged para que `server.js` encuentre `gifts/`, `public/`, `asset/`, `blocked-words.md` en `process.resourcesPath` (fuera del asar)
- `IS_PKG` — legado del approach anterior con pkg (aún presente en server.js, no afecta Electron)

## Paths críticos en producción (packaged)

```
%LOCALAPPDATA%\TikTok TTS\
  TikTok TTS.exe
  resources\
    app.asar              ← main.js + server.js + node_modules
    gifts\                ← 810 PNGs de regalos TikTok (188 MB)
    public\               ← HTML/CSS/JS de la UI y overlays
    asset\                ← flags SVG, iconos
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

## Funcionalidades actuales

- TTS en 13 idiomas via Google Translate (es, es-MX, es-AR, en, en-GB, pt, pt-PT, fr, de, it, ja, zh-CN, ru, ko)
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

## Roadmap / Pendiente

- [ ] Firma de código del installer (elimina warning de Windows Defender)
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

**bufferutil/utf-8-validate:** Dependencias opcionales de `ws`. Se incluyen en el build con sus binarios precompilados para Node.js (NAPI, compatibles con Electron sin rebuilding). Se excluyen solo los `.pdb` (debug symbols, innecesarios en producción).

## Repositorio

- GitHub: https://github.com/iKhunsa/tiktok-tts
- Releases: https://github.com/iKhunsa/tiktok-tts/releases
