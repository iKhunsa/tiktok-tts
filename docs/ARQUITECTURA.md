# Arquitectura — Backend por dominios

Backend reconstruido por dominios (rebuild completo, ver `plan-fases/` para el historial de las 14 fases y `arquitectura-propuesta.md` para el documento de diseño vivo).

## Estructura general

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

## Contrato entre dominios

Un dominio nunca importa el módulo interno de otro (`require('../otro-dominio/...')`). Toda comunicación cruzada pasa por:

1. **`core/event-bus.js`** (`bus.emit`/`bus.on`) — para eventos fire-and-forget.
2. **Contratos síncronos en `core/contracts/*.js`** (ej. `moderacion-policy.js`, `idioma-filtrar.js`, `obs-replay.js`) — cuando el orden de ejecución importa.

`core/register-domain.js` monta cada dominio en su propio try/catch — un dominio que falla al arrancar no tumba a los demás.

## Endpoints HTTP relevantes

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

## Referencias

- Ver `/docs/MODULARIDAD.md` — reglas de dónde vive cada helper
- Ver `plan-fases/` — historial de las 14 fases de rebuild
- Ver `arquitectura-propuesta.md` — documento de diseño vivo
