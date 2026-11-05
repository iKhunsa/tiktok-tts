# Arquitectura y Modularidad

## Backend por dominios

Backend reconstruido por dominios (rebuild completo, ver `plan-fases/` para el historial de las 14 fases y `arquitectura-propuesta.md` para el documento de diseño vivo).

### Estructura general

Ya no es un monolito: `main.js`/`server.js` son orquestadores delgados, toda la lógica de negocio vive repartida en carpetas por dominio bajo `features/` (los 16 dominios agrupados ahí a propósito, para no saturar la raíz del repo — `core/` y `electron-shell/` NO son features, se quedan sueltos en la raíz por ser kernel/shell).

```
main.js (Electron main process)
  ├── require('./server.js')       ← arranca /core + registra los 16 dominios de features/
  ├── electron-shell/window.js     ← BrowserWindow, carga http://localhost:3000
  ├── electron-shell/tray.js       ← ícono bandeja, menú open/exit
  ├── electron-shell/updater.js    ← autoUpdater, chequea GitHub Releases
  ├── electron-shell/uiohook.js    ← atajos globales (fullscreen-safe)
  ├── electron-shell/ipc-bridge.js ← IPC con el renderer (atajos, soundpad, telemetría)
  └── electron-shell/single-instance.js

server.js (Express + WS en puerto 3000)
  ├── core/                          ← kernel: bus de eventos, logger, http/ws server, register-domain
  └── features/
      ├── configuracion/             ← único dueño de config.json y platform-config.json
      ├── idioma/                    ← filtro de idioma/script de voz (puro)
      ├── reporte-bug/                ← webhook de Discord, retención de logs
      ├── moderacion/                ← moderation.json, blocked-words.json, @tiklivetts/chat-guard
      ├── canales/                   ← TikTok/Twitch/YouTube/Kick + OBS — único productor de eventos crudos
      ├── chat/                      ← orquesta: crudo → moderación → chat:mensaje-permitido
      ├── promo/                     ← avisos promocionales periódicos (announce-texts)
      ├── epik/                      ← overlays .epik a medida importados como skin
      ├── overlay/                   ← estado visual (gifts, followers, likes) para OBS
      ├── movil/                     ← panel remoto (espejo de estado + comandos)
      ├── sonido/                    ← TTS (Google), bot musical (yt-dlp), soundpad
      ├── bot/                       ← detección de comandos de chat (!p)
      ├── clips/                     ← marca clip en OBS (atajo o comando móvil)
      ├── avanzado/ + donar/         ← no-op documentados: lugar para crecer
      ├── telemetria/                ← uso agregado anónimo, self-hosted
      └── mcp/                       ← servidor MCP (tools para agentes), registrado ÚLTIMO
```

### Contrato entre dominios

Un dominio nunca importa el módulo interno de otro (`require('../otro-dominio/...')`). Toda comunicación cruzada pasa por:

1. **`core/event-bus.js`** (`bus.emit`/`bus.on`) — para eventos fire-and-forget.
2. **Contratos síncronos en `core/contracts/*.js`** (ej. `moderacion-policy.js`, `idioma-filtrar.js`, `obs-replay.js`) — cuando el orden de ejecución importa.

`core/register-domain.js` monta cada dominio en su propio try/catch — un dominio que falla al arrancar no tumba a los demás.

### Endpoints HTTP relevantes

```
GET  /                       ← index.html (UI principal)
GET  /advanced.html          ← configuración avanzada
GET  /overlay-*.html         ← overlays para OBS
POST /api/connect            ← conecta a TikTok Live (features/canales/)
POST /api/tts                ← Google TTS → stream MP3 (features/sonido/)
WS   /                       ← broadcast eventos al browser (core/broadcast.js)
GET  /api/gifts-list         ← lista PNGs de regalos (features/overlay/)
PATCH /api/config            ← ajusta config en runtime (features/configuracion/)
GET  /api/platforms/status   ← estado twitch/youtube (features/canales/)
POST /api/platforms/connect  ← conecta twitch o youtube (features/canales/)
POST /api/platforms/disconnect
GET  /api/moderation/viewers ← registro de espectadores (moderacion/)
POST /api/moderation/{mute,unmute,ban,unban,clear,follower}
```

## Regla de modularidad — "un archivo por función" + antes reusar

La estructura es **un archivo `.js` por función/responsabilidad** (backend y frontend). Si una responsabilidad necesita varios archivos (estado + helpers), se agrupan en una carpeta con su `index.js`. 

**Nombres de archivo en kebab-case inglés** describiendo lo que exportan; **carpetas de dominio/vista en kebab-case español**.

### "Un archivo por función" ≠ "copiar y pegar"

Antes de escribir un helper:

1. **Grepealo.** Si ya existe en el repo — aunque sea en otro dominio — reusalo, no lo reimplementes.
2. **Si dos o más lugares necesitan la misma lógica**, va en **UN** archivo compartido, nunca duplicado:
   - Backend puro (sin estado, sin config) → `core/<nombre>.js` (ej. `core/config-snapshot.js`)
   - Backend con orden de ejecución / inyección → contrato en `core/contracts/*.js`
   - Frontend agnóstico de vista → `interfaz/src/nucleo/` o `interfaz/compartido/` (este último si además lo usan los overlays)
3. **Un dominio nunca comparte su helper importándolo desde otro dominio.** Si `sonido/` y `moderacion/` necesitan lo mismo, sube a `core/`.

### Señales de que te pasaste (borrar, no crear)

- Un archivo que **solo re-exporta** otro (barrel de un símbolo)
- Un contrato/factory/wrapper con **un solo productor y un solo consumidor** y sin lógica propia — inline en el call site
- Un flag de config que nadie prende/apaga (siempre el mismo valor)

### Umbral — dónde vive un helper (por alcance, no por conteo)

| Consumidores | Ubicación | Ejemplo |
|---|---|---|
| **1** | Inline en el call site, o local al dominio si ya tiene carpeta. No sube. | `telemetria/identity.js#sessionId` → 1, se queda |
| **2+ en el MISMO dominio** | Archivo compartido dentro de esa carpeta de dominio | `sonido/tts/cache.js` reutilizado en `sonido/musica/` |
| **2+ CRUZANDO dominio** | `core/<nombre>.js`, siempre. El disparador es el cruce, no el número. | `getConfigSnapshot` → 5 dominios → `core/config-snapshot.js` |

**Regla de pulgar:** la 2ª copia textual es olor; la 3ª es un bug. Al ver la 2ª, extraé al alcance más chico que la cubra.

### Cuándo un `core/contracts/*.js` (y no un `core/<nombre>.js` pelado)

Incluso a n=1, solo si compra una de estas tres:

1. **Desacople de una dependencia pesada/opcional.** `perf.js` evita que `sonido/` haga `require('@sentry/electron')`. Sin el contrato, el dominio queda atado a Sentry.
2. **Orden de arranque forzado / inyección.** `obs-replay.js` garantiza que el productor (`canales/obs`) registró su impl antes de que el consumidor la llame. Un `require` normal no expresa "esto tiene que proveerse primero".
3. **Default no-op que ya funciona sin proveedor.** `entitlements.check()` devuelve `true` mientras nadie llamó `provide()`.

Si no compra ninguna de las tres, es solo mover una función detrás de una capa → `core/<nombre>.js` pelado, sin la ceremonia del contrato.

### Excepciones documentadas (copias deliberadas, NO tocar)

Los `toast.js` de `avanzada/` y `movil/` (cada vista legacy conserva el suyo hasta unificar la paleta CSS — ver `plan-fases/06`).
