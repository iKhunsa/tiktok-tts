# Build, Release y Decisiones técnicas

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

## GitHub Actions (`.github/workflows/release.yml`)

- **Trigger:** push de tag `v*`
- **Runner:** `windows-latest` (requerido para NSIS sin wine)
- **Permisos:** `contents: write` para publicar release
- **Sin firma de código:** `CSC_IDENTITY_AUTO_DISCOVERY=false`
- **Publicación automática:** electron-builder publica automáticamente con `--publish always`

## Auto-update

`electron-updater` chequea `https://github.com/iKhunsa/tiktok-tts/releases/latest/download/latest.yml` al arrancar. Si hay versión nueva:
- Descarga en background
- Diálogo "Instalar ahora / Después"
- `autoUpdater.quitAndInstall()`

Solo activo en modo packaged (`app.isPackaged`).

## Variables de entorno clave

- `TIKTOK_RESOURCES_PATH` — set por `main.js` en modo packaged para que `core/paths.js` (`RESOURCE_BASE`) resuelva `gifts/`, `public/` (output empaquetado de `interfaz/dist/`, ver extraResources), `asset/`, `lang-words/`, `blocked-words.md` en `process.resourcesPath` (fuera del asar)
- `TIKTOK_USER_DATA_PATH` — set por `main.js` a `app.getPath('userData')`; `core/paths.js` (`DATA_BASE`) lo usa para `config.json`, `moderation.json`, `logs/`, etc.

**Regla — nunca armar un path de recurso con `__dirname` en el backend.** Siempre `RESOURCE_BASE` / `DATA_BASE` de `core/paths.js`. En el paquete NSIS el código del backend corre desde dentro de `app.asar`, así que `__dirname` cae dentro del asar y `interfaz/`, `gifts/`, `asset/`, etc. **no viajan ahí** (van a `resources/` vía `extraResources`). 

La raíz estática de la UI se resuelve con `core/static-root.js` (`interfaz/dist` en dev, `<resources>/public` en empaquetado) — lo usan `core/app.js` y `features/movil/routes/mobile-page.js`. Este descuido causó el bug "Cannot GET /" de v1.8.0–v1.8.3 (`core/app.js` servía `interfaz/dist` con ruta `__dirname`-relativa); cubierto ahora por `test/serve-ui.test.js`.

## Paths críticos en producción (packaged)

```
%LOCALAPPDATA%\TikLiveTTS\
  TikLiveTTS.exe
  resources\
    app.asar              ← main.js + server.js + los 17 dominios + electron-shell/ + telemetria/ + node_modules
    gifts\                ← 810 PNGs de regalos TikTok (188 MB)
    public\               ← output de `vite build` (interfaz/dist/), vía extraResources
    asset\                ← flags SVG, iconos (Material Icons)
    lang-words\           ← diccionarios de frecuencia por idioma
    blocked-words.md      ← palabras bloqueadas (r/w en runtime)
    tray-icon.ico
```

## Decisiones técnicas importantes

**Por qué Electron y no pkg:** pkg no puede mostrar UI nativa. El usuario quería que todo estuviera dentro del exe, sin abrir el navegador externo. Electron embebe Chromium y sirve la UI internamente.

**Por qué no se firma el código:** Requiere certificado de firma (~$300-500/año). Windows Defender mostrará warning en la primera instalación ("Windows protegió tu PC"). El usuario puede hacer clic en "Más información → Ejecutar de todas formas".

**Por qué Google TTS y no Web Speech API:** Web Speech API requiere que la pestaña del navegador esté activa y en primer plano. Google TTS corre en el servidor y funciona aunque la ventana esté minimizada.

### Resiliencia del TTS (`features/sonido/tts/fetch-audio.js`)

Google Translate TTS es el endpoint gratis sin API key; rate-limitea el IP devolviendo `200` + body vacío. `fetch-audio.js` mete 3 capas:

- **Cache** en disco (`DATA_BASE/tts-cache/`, clave `sha1(lang|slow|text)`, poda a 450 archivos al pasar de 600) — frases repetidas (saludos, nombres de regalos, nicks) salen del archivo sin tocar Google
- **Retry** (hasta 2 reintentos ante body vacío / red / timeout, no ante 4xx)
- **Backoff** de módulo (3 fallos seguidos → pausa 5s→15s→60s, mientras falla rápido sin red; un éxito resetea)

`generate.js` bufferea la respuesta (ya no `pipe`) y mapea el `code` de fallo a HTTP (`503` en backoff con `retryAfter`, `502` el resto). El warn `sonido.tts.respuesta_pequena` **ya no** se promueve a issue de GlitchTip (queda en la sección Logs) — era ruido en cada blip de rate-limit.

**Por qué extraResources y no asar:** `gifts/` tiene 188 MB de PNGs. Meterlos en el asar los haría parte del bundle comprimido pero el asar tiene límites prácticos de tamaño y acceso. `extraResources` los deja en el sistema de archivos real, accesibles via `process.resourcesPath`.

**Secrets embebidos en el instalador (webhook Discord, token telemetría) — riesgo aceptado:**

`webhook-config.generated.json` / `telemetry-config.generated.json` se inyectan en build time (desde secrets de CI) y viajan dentro de `extraResources` — extraíbles por cualquiera que descompacte el instalador. Se evaluó moverlos detrás de un proxy/backend propio y se descartó: agrega infraestructura hosteada 24/7 solo para ocultar un webhook de baja severidad (spam de bug reports, no acceso a datos de usuarios). 

**Mitigación real:** rotación barata. Si se filtra el webhook — regenerar en Discord (Server Settings → Integrations → Webhooks), actualizar el secret `DISCORD_BUG_REPORT_WEBHOOK` en GitHub Actions, cortar un nuevo release (`git tag vX.Y.Z && git push --tags`); el build viejo filtrado queda inútil apenas se rota. Igual para el token de telemetría vía `TELEMETRY_URL`/su secret correspondiente.

### Kick — conexión directa desde Node (2026-08)

El bloqueo de Cloudflare que antes forzaba descartar Kick ya no aplica a `https://kick.com/api/v2/channels/{slug}` (responde 200 a Node sin headers especiales). El chat va por el Centrifugo propio de Kick (2026-10; antes era Pusher `32cbd69e…`, Kick dio de baja esa app y responde `4001 App key not in this cluster`). 

Handshake sin login:
- `POST web.kick.com/api/v1/realtime/channels/{channelId}/chat/connection` → URL del WS
- `POST /v1/realtime/auth/connection {client_id}` → token de invitado (caduca ~45 min, se renueva con el MISMO client_id vía comando `refresh`)
- Canal `chatrooms.{chatroom_id}.v2`, mismo payload `ChatMessageEvent` que Pusher

`features/canales/kick/`: `fetch-chatroom.js` (slug → chatroom.id/channel_id) + `fetch-realtime-session.js` (URL + token) + `centrifugo.js` (frames) + `connect-kick.js` (WS + subscribe + dedup + watchdog + backoff, mismo patrón que YouTube) + `handle-event.js` (parse del `ChatMessageEvent`).

**No usa Electron** — funciona igual en `node server.js` que empaquetado. Los emotes llegan como `[emote:ID:nombre]` dentro de `content` y los expande `features/chat/emit-chat-message.js#extractKickMessage` a `:nombre:` + `https://files.kick.com/emotes/{id}/fullsize` (los globales/7TV que Kick manda como texto plano no se resuelven, igual que en Twitch/YT). 

Si Kick vuelve a cerrar la API con Cloudflare, el único punto a parchear es `fetch-chatroom.js` (proxy propio o ventana Electron). El watchdog (`stale-watchdog.js`, 5 min sin mensajes → `canales.kick.sin_eventos` + reconexión) es la red de seguridad.

### Dependencias opcionales

**bufferutil/utf-8-validate:** Dependencias opcionales de `ws`. Se incluyen en el build con sus binarios precompilados para Node.js (NAPI, compatibles con Electron sin rebuilding). Se excluyen solo los `.pdb` (debug symbols, innecesarios en producción).

### Cola TTS timestamp-ordered

`speechQueue` en el cliente almacena `{ text, msgId, timestamp }`. Al agregar cada mensaje, el array se re-ordena por `timestamp` ascendente. Esto garantiza que si Twitch, YouTube y TikTok envían mensajes casi simultáneos, se lean en el orden real en que los usuarios los escribieron (según el timestamp del servidor que recibió cada evento).
