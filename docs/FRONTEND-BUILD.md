# Frontend, Build y UX

## Frontend modular (`interfaz/`)

Rebuild completo del frontend: HTML monolítico → módulos ESM en `interfaz/`, siguiendo la misma regla de modularidad del backend (ver `ARQUITECTURA-MODULARIDAD.md`).

El `public/` legado ya no existe — `interfaz/dist/` (build de Vite) es la única raíz estática que sirve `core/app.js`.

### Estructura

```
interfaz/
  index.html  advanced.html  mobile.html  overlay-*.html   ← entries de Vite
  src/
    nucleo/          ← framework-agnostic: ws/, estado/, i18n/, tts/, log-storage.js
    componentes/      ← toast, campos de formulario reutilizables
    vistas/
      principal/       ← index.html (~30 módulos, orquestador en index.js)
      avanzada/         ← advanced.html
      movil/            ← mobile.html (panel remoto)
  compartido/        ← consumido además por los 7 overlays vanilla de OBS
  publico/           ← Vite publicDir: icons/, flags/, locales/, vendor/,
                         plugin-store/, img/, asset/, logos, favicon
  dist/              ← generado (gitignored), output de `vite build`
```

### Convenciones

- **Carpetas de dominio/vista:** kebab-case **español** (espejo de las carpetas de dominio del backend)
- **Nombres de archivo:** kebab-case **inglés** describiendo la función (`cliente-ws.js` → `conectarWS`)
- **Módulos:** CommonJS en el backend, ESM (`import`/`export`) en el frontend — única diferencia
- **Excepción:** `interfaz/publico/plugin-store/` y `interfaz/publico/vendor/` son scripts clásicos que Vite copia a `dist/` sin tocar

**Núcleo:** `interfaz/src/nucleo/` es framework-agnostic y no depende de ninguna vista. Las vistas no se importan entre sí, solo consumen `nucleo/` y `componentes/`.

**Sin framework de UI (no React):** estado en un mini-store propio (`crearAlmacen`) y vistas dinámicas usan helpers de render dirigido en `interfaz/src/render/`.

**Recursos:** `gifts/`, `sounds/`, `asset/` (fuente de iconos) y `lang-words/` (diccionarios del filtro de idioma) siguen en la raíz del repo — son recursos que lee el **backend** por filesystem, no estáticos servidos al cliente.

## i18n — 10 idiomas (es, en, it, pt, fr, de, zh, ja, ko, ru)

**Obligatorio para todo texto nuevo visible al usuario.** Nunca hardcodear strings en HTML/JS/backend.

### Frontend

**Función única:** `t(key, vars)` en `interfaz/src/nucleo/i18n/i18n.js` (índice.html/advanced.html/mobile.html) y su espejo `interfaz/compartido/i18n-overlay.js` para los 7 overlays vanilla de OBS.

**Objeto `_locale`:** cargado desde `fetch('/locales/${lang}.json')` (fallback a `es.json`). Interpolación de variables con `{var}` dentro del string.

**Markup estático:**
- `data-i18n="seccion.clave"` → `textContent`
- `data-i18n-html` → `innerHTML`
- `data-i18n-placeholder` → `placeholder`
- `advanced.html` además soporta `data-i18n-title`

**Texto armado en JS:** `t('seccion.clave', { var: valor })`, nunca template literal.

**Idioma elegido:** persiste en `localStorage['tikliveTTS_lang']` — puramente client-side.

### Diccionarios

`interfaz/publico/locales/{es,en,it,pt,fr,de,zh,ja,ko,ru}.json` (Vite `publicDir` — se copian a `interfaz/dist/locales/` al buildear).

**`es.json` es la fuente de verdad** — agregar la clave ahí primero, después propagar a los otros 9. No dejar ningún idioma sin la clave nueva; la paridad es lo que se valida.

**Nombrar las claves:** `seccion.claveDescriptiva`, reusando secciones existentes (`toast.*`, `conn.*`, `overlayStr.*`) en vez de crear nuevas.

### Backend

Si una ruta HTTP devuelve un mensaje de error que el frontend muestra (`res.status(N).json({ error: '...' })`), sumarle también `errorKey: 'errors.claveDescriptiva'` — nunca reemplazar `error`, solo agregar la clave.

El frontend prefiere `errorKey` traducido vía el helper `tErr(data, fallbackKey)` (definido en `index.html` y `advanced.html`) y cae al texto crudo si no hay `errorKey` o no resuelve.

### Excepciones legítimas — no traducir

- Nombres de marca/plataforma (`TIKTOK`, `TWITCH`, `YOUTUBE`, `BITS`, `RAID`, `SUPERCHAT`)
- `<title>` de los overlays (solo los ve el streamer armando OBS)
- Contenido dinámico que viene del usuario (nombre de usuario, texto del chat)

**Sistemas aparte:** `core/announce-texts.js` (avisos TTS) y `features/idioma/` (filtro de idioma) ya cubren sus propios idiomas — no confundir con el i18n de UI.

### Validación

Antes de dar por terminada una función con texto nuevo: correr un script que cuente claves hoja de los 10 JSON y confirme que coinciden. Un idioma con menos claves es señal de que faltó propagar algo.

## Iconografía — nunca emojis en UI nueva

Los emojis que ya están en el código (`🎁`, `💾`, `🔴`, etc.) se quedan tal cual. Pero **código nuevo o modificado nunca usa emoji como ícono de UI** (botones, labels, badges, títulos de card).

En su lugar:

1. Buscar el ícono que mejor encaje en `asset/icons/` (catálogo Material Icons completo, ~1300 SVGs — es solo fuente).
2. Copiarlo a `interfaz/publico/icons/` (Vite `publicDir` — se copia a `interfaz/dist/icons/`, que sí sirve Express).
3. Usarlo con `<img class="icon-inline" src="icons/nombre.svg" alt="">`, mismo patrón que el resto de la app.

Los SVG de `asset/icons/` vienen en un solo color (negro/currentColor). Si el ícono necesita otro color (ej. un ícono de estado en rojo/verde), está permitido copiarlo con otro nombre y editar el `fill`/`stroke` directo en el XML del SVG — son archivos de texto planos, se editan igual que código.

## Diseño / UX del frontend — skills de referencia obligatorias

**Cada vez que se toque UX/UI o se agregue código visual nuevo** (vistas, componentes, CSS, markup, animaciones, transiciones, estados de interacción) hay que **consultar las skills de design engineering de Emil Kowalski:**

- `/emil-design-eng` — filosofía de pulido de UI, diseño de componentes, decisiones de detalle. Invocarla antes de escribir markup/CSS.
- `/animate` — construir una animación desde cero.
- `/improve-animations` — auditar animaciones existentes.
- `/find-animation-opportunities` — dónde una animación aporta de verdad.
- `/animation-vocabulary` — vocabulario preciso para describir el movimiento.
- `/apple-design` — principios de interfaz y movimiento fluido de Apple.

**Regla práctica:** antes de dar por cerrada una mejora visual, pasar el diff por `/improve-animations` (si hay movimiento) y por el criterio de `/emil-design-eng` (jerarquía, foco, estados `:active`/`:focus`, `transition` con propiedades explícitas nunca `all`, `ease-out` para feedback inmediato).

---

## Build, Release y Decisiones técnicas

### Flujo de build y release

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

### GitHub Actions (`.github/workflows/release.yml`)

- **Trigger:** push de tag `v*`
- **Runner:** `windows-latest` (requerido para NSIS sin wine)
- **Permisos:** `contents: write` para publicar release
- **Sin firma de código:** `CSC_IDENTITY_AUTO_DISCOVERY=false`
- **Publicación automática:** electron-builder con `--publish always`

### Auto-update

`electron-updater` chequea `https://github.com/iKhunsa/tiktok-tts/releases/latest/download/latest.yml` al arrancar. Si hay versión nueva: descarga en background → diálogo "Instalar ahora / Después" → `autoUpdater.quitAndInstall()`. Solo activo en modo packaged (`app.isPackaged`).

### Variables de entorno clave

- `TIKTOK_RESOURCES_PATH` — set por `main.js` en modo packaged para que `core/paths.js` (`RESOURCE_BASE`) resuelva `gifts/`, `public/`, `asset/`, `lang-words/`, `blocked-words.md` en `process.resourcesPath` (fuera del asar)
- `TIKTOK_USER_DATA_PATH` — set por `main.js` a `app.getPath('userData')`; `core/paths.js` (`DATA_BASE`) lo usa para `config.json`, `moderation.json`, `logs/`, etc.

**Regla — nunca armar un path de recurso con `__dirname` en el backend.** Siempre `RESOURCE_BASE` / `DATA_BASE` de `core/paths.js`. En el paquete NSIS el código del backend corre desde dentro de `app.asar`, así que `__dirname` cae dentro del asar. La raíz estática de la UI se resuelve con `core/static-root.js` (`interfaz/dist` en dev, `<resources>/public` en empaquetado).

### Paths críticos en producción (packaged)

```
%LOCALAPPDATA%\TikLiveTTS\
  TikLiveTTS.exe
  resources\
    app.asar              ← main.js + server.js + 17 dominios + electron-shell/ + node_modules
    gifts\                ← 810 PNGs de regalos TikTok (188 MB)
    public\               ← output de `vite build` (interfaz/dist/), vía extraResources
    asset\                ← flags SVG, iconos (Material Icons)
    lang-words\           ← diccionarios de frecuencia por idioma
    blocked-words.md      ← palabras bloqueadas (r/w en runtime)
    tray-icon.ico
```

### Decisiones técnicas clave

**Por qué Electron y no pkg:** pkg no puede mostrar UI nativa. El usuario quería que todo estuviera dentro del exe. Electron embebe Chromium y sirve la UI internamente.

**Por qué no se firma el código:** Requiere certificado de firma (~$300-500/año). Windows Defender mostrará warning en la primera instalación. El usuario puede hacer clic en "Más información → Ejecutar de todas formas".

**Por qué Google TTS y no Web Speech API:** Web Speech API requiere que la pestaña esté activa y en primer plano. Google TTS corre en el servidor y funciona aunque la ventana esté minimizada.

**Resiliencia del TTS (`features/sonido/tts/fetch-audio.js`):** Google Translate TTS es el endpoint gratis sin API key; rate-limitea devolviendo `200` + body vacío. `fetch-audio.js` mete 3 capas:
- **Cache** en disco (`DATA_BASE/tts-cache/`, clave `sha1(lang|slow|text)`, poda a 450 archivos)
- **Retry** (hasta 2 reintentos ante body vacío / red / timeout)
- **Backoff** de módulo (3 fallos → pausa 5s→15s→60s; un éxito resetea)

**Por qué extraResources y no asar:** `gifts/` tiene 188 MB. Meterlos en el asar los haría parte del bundle comprimido pero el asar tiene límites. `extraResources` los deja en el filesystem real.

**Kick — conexión directa desde Node (2026-08):** El bloqueo de Cloudflare que antes forzaba descartar Kick ya no aplica. El chat va por el Centrifugo propio de Kick. Handshake sin login: POST → URL del WS; POST → token de invitado. `features/canales/kick/`: `fetch-chatroom.js` + `fetch-realtime-session.js` + `centrifugo.js` + `connect-kick.js` (WS + subscribe + dedup + watchdog + backoff) + `handle-event.js`. **No usa Electron** — funciona igual en `node server.js` que empaquetado.

**bufferutil/utf-8-validate:** Dependencias opcionales de `ws`. Se incluyen en el build con sus binarios precompilados para Node.js (NAPI, compatibles con Electron). Se excluyen solo los `.pdb` (debug symbols).

**Cola TTS timestamp-ordered:** `speechQueue` en el cliente almacena `{ text, msgId, timestamp }`. Al agregar cada mensaje, el array se re-ordena por `timestamp` ascendente. Garantiza que si Twitch, YouTube y TikTok envían mensajes casi simultáneos, se lean en el orden real en que los usuarios los escribieron.

**Secrets embebidos en el instalador (webhook Discord, token telemetría) — riesgo aceptado:** `webhook-config.generated.json` / `telemetry-config.generated.json` se inyectan en build time y viajan en `extraResources` — extraíbles por cualquiera que descompacte el instalador. Se evaluó moverlos detrás de un proxy propio y se descartó: agrega infraestructura hosteada 24/7 solo para ocultar un webhook de baja severidad. **Mitigación real:** rotación barata. Si se filtra → regenerar en Discord, actualizar el secret en GitHub Actions, cortar un nuevo release.
