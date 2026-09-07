# Notas de parche — v1.7.2 → v1.8.3

**Fecha:** 2026-09-07
**Alcance:** 60 commits · 605 archivos · +38 231 / −18 505 líneas

Release mayor. Reescritura completa del backend y del frontend, cuarta plataforma
de chat (Kick), servidor MCP para agentes, y dos capas nuevas de analítica /
error-tracking self-hosted. La app se ve casi igual; casi todo el cambio es
estructural, de resiliencia y de plataforma.

---

## 1. Backend reescrito por dominios (Fases 0–13)

El monolito `server.js` (~4 100 líneas) se partió en un kernel + dominios.

- `server.js` / `main.js` ahora son orquestadores delgados.
- `core/` — kernel: bus de eventos, logger, servidor http/ws, `register-domain`.
- `features/` — 16 dominios de negocio, un archivo por función/responsabilidad:
  `configuracion`, `idioma`, `reporte-bug`, `moderacion`, `canales`, `chat`,
  `promo`, `overlay`, `movil`, `sonido`, `bot`, `clips`, `avanzado`, `donar`,
  `telemetria`, `mcp`.
- **Contrato entre dominios:** ningún dominio importa el módulo interno de otro.
  Todo pasa por `core/event-bus.js` o por contratos síncronos inyectados en
  `core/contracts/*.js`.
- `core/register-domain.js` monta cada dominio en su propio try/catch — un
  dominio que falla al arrancar no tumba a los demás.
- Documentación viva del rediseño en `plan-fases/` y `arquitectura-propuesta.md`.

**Impacto para el usuario:** arranque más robusto, un fallo aislado ya no cae la
app entera. Sin cambios visibles de UI.

---

## 2. Kick — cuarta plataforma de chat

- Kick se suma a TikTok Live, Twitch y YouTube.
- Conexión **directa desde Node** vía API pública de kick.com + Pusher público
  (`wss://ws-us2.pusher.com`, sin auth). No usa Electron — funciona igual en
  `node server.js` que empaquetado.
- `features/canales/kick/`: `fetch-chatroom.js` (slug → chatroom id) +
  `pusher.js` + `connect-kick.js` (WS + subscribe + dedup + watchdog + backoff) +
  `handle-event.js`.
- Emotes `[emote:ID:nombre]` se expanden a imagen (`files.kick.com/emotes/...`).
- Watchdog de chat silencioso (5 min → reconexión), mismo patrón que YouTube.
- Moderación de espectadores de Kick integrada al registro común.

---

## 3. Servidor MCP — herramientas para agentes (Fases 1–5)

Nuevo dominio `features/mcp/` que expone las capacidades de la app como **tools
MCP** (Model Context Protocol) para que un agente (Claude Code / Desktop) opere
la app: leer chat, moderar, manejar música, consultar estado.

- Transporte **Streamable HTTP** en `POST /mcp` (stateless).
- `core/contracts/mcp-registry.js` — registro append-only de tools + state
  providers. `get_state` = pull agregado de cada dominio.
- **Regla forzada por CI:** todo dominio que monta `app.post/patch/delete` debe
  registrar su tool MCP. Verificado por `scripts/check-mcp.js` +
  `test/mcp-registry.test.js`.
- **Doble gate de destructivas:** `mcpEnabled` (default on, solo-localhost) +
  `mcpDestructiveToolsEnabled` (default off). Tools destructivas (ban / mute /
  disconnect / set_config) se filtran del cable cuando el 2º toggle está off.
- **Auth remota (seam):** por defecto solo-localhost; env `MCP_TOKEN` habilita
  `Authorization: Bearer`.
- **Observabilidad gratis:** cada `callTool` → bus → GlitchTip + Aptabase
  (`mcp_tool_used`) + telemetría. Todo error del subsistema se fingerprintea
  como `error_mcp_*`.
- Toolset de desarrollo `dev_*` para agentes.
- **UI:** sección "Agente MCP" en la tienda de plugins (nace oculta) — toggles,
  endpoint, snippets de config, tabla de tools por dominio. Descripciones i18n
  en los 10 idiomas.
- `GET /api/mcp/info` — catálogo de tools para la UI.

---

## 4. Frontend reescrito con Vite + ESM (Fases 01–06)

El HTML monolítico se partió en módulos ESM bajo `interfaz/`.

- `interfaz/index.html`, `advanced.html`, `mobile.html`, `overlay-*.html` como
  entries de Vite (multi-entry, `interfaz/vite.config.js`).
- `interfaz/src/` — `nucleo/` (WS, estado, i18n, cola TTS — framework-agnostic),
  `componentes/`, `vistas/{principal,avanzada,movil}/`. Un archivo por función.
- **Sin framework de UI** — mini-store propio (`crearAlmacen`) + helpers de
  render dirigido.
- Los **7 overlays vanilla de OBS** migrados; comparten `interfaz/compartido/`.
- **i18n unificado:** función única `t(key, vars)` + espejo
  `i18n-overlay.js` — se acabó el copy-paste de traducciones por archivo.
- El `public/` legado se borró del repo. `interfaz/dist/` (build de Vite) es la
  única raíz estática que sirve el backend.
- Capa de **tokens de color / movimiento** + **sistema de toasts en cola**.
- Bundler corre en build (`npm run build:front`); scripts nuevos `dev:front`,
  `dev:build-watch`, `dev:all`, `serve`.

---

## 5. Analítica de producto — Aptabase self-hosted

Nuevo `electron-shell/aptabase.js` (`@aptabase/electron`, self-hosted en
`aptabase.tiklivetts.es`). **Solo conteo de eventos / funnels / DAU-MAU /
retención — los errores NO van acá.**

- Los dominios no conocen Aptabase: loguean su evento de negocio y
  `aptabase.js#attach` mapea `log:entry` + algunos eventos del bus → `trackEvent`.
- Evento **`installacion`** — se dispara exactamente una vez en la vida del
  usuario (marca persistida, helper `install-marker.js`).
- Eventos: ciclo de vida, activación (`platform_connected`, `first_tts`),
  adopción (overlays, móvil, clips, música, promo, bug report, soundpad), config
  (**solo la clave, nunca el valor**), moderación.
- **Resúmenes de sesión:** eventos de alta frecuencia se acumulan en memoria y
  salen bucketeados en `session_ended` (1 POST al cerrar). `bucket()` en
  `electron-shell/bucket.js`, testeado.
- Sin `APTABASE_APP_KEY` → no-op total. Sin `machine_id` (máxima privacidad).
- Toda prop pasa por `sanear()` + clip a 200 chars, tope 20 props/evento.

---

## 6. Error tracking — GlitchTip

`electron-shell/glitchtip.js` (`@sentry/electron`, self-hosted en
`glitchtip.tiklivetts.es`). **Los errores van acá, no a Aptabase.**

- Captura crashes del main + `error:handled` / `error:uncaught` del bus.
- Breadcrumbs (150) de actividad previa, snapshot de `estado_app`, tail del log
  de sesión en el issue, fingerprint en español (`error_conexion_tiktok`, …).
- `warn` promovidos a issue, detección de "sesión problemática", perf spans.
- El botón "Reportar bug" también llega acá.
- Cobertura total del subsistema MCP (Fase 5).

---

## 7. Resiliencia del TTS

`features/sonido/tts/fetch-audio.js` — 3 capas contra el rate-limit del endpoint
gratis de Google Translate TTS:

- **Cache** en disco (`DATA_BASE/tts-cache/`, clave `sha1(lang|slow|text)`, poda
  a 450 archivos al pasar de 600). Saludos, nombres de regalos y nicks salen del
  archivo sin tocar Google.
- **Retry:** hasta 2 reintentos ante body vacío / red / timeout (no ante 4xx).
- **Backoff** de módulo: 3 fallos seguidos → pausa 5 s → 15 s → 60 s; un éxito
  resetea.
- `generate.js` bufferea la respuesta y mapea el fallo a HTTP (`503` en backoff
  con `retryAfter`, `502` el resto).
- El warn `sonido.tts.respuesta_pequena` ya no se promueve a issue de GlitchTip
  — era ruido en cada blip de rate-limit.

---

## 8. Moderación de espectadores

- Store migrado a **un archivo por función** (`features/moderacion/store/*.js`)
  sobre un `state` compartido, en vez de un closure gigante.
- `features/chat/emit-chat-message.js` es el **único** punto por el que salen los
  mensajes de las 4 plataformas: llama sincrónicamente a
  `moderacionPolicy.evaluate()` (fail-open si lanza) y publica
  `chat:mensaje-permitido` / `chat:mensaje-bloqueado`. Los handlers de plataforma
  ya no repiten reglas.
- Escritura con debounce (15 s, techo 60 s); las acciones de moderación hacen
  flush inmediato. JSON corrupto se aparta y arranca vacío, nunca lanza.
- Cap de 5 000 espectadores con purga LRU a 4 000 que nunca descarta seguidores,
  whitelisted ni castigos vivos.

---

## 9. Bot de música y tienda de plugins

- Bot musical: `yt-dlp`, soporte de **playlists**, rediseño de UI del "Bot de
  Música".
- Tienda de plugins: previews de plugins (imagen de vista previa), animaciones de
  transición entre vistas, detalle de plugin con media / about / drag-drop,
  i18n de los anuncios TTS.

---

## 10. UI y cambios visuales

- **Menú lateral configurable** (orden de las secciones).
- **Banners publicitarios Epik:** carrusel lateral con crossfade + leve zoom
  (rota cada 30 s) y banner central bajo el chat. Ambos ahora son **clickables y
  abren la invitación de Discord** en pestaña nueva (`.ad-link`).
- Nueva imagen de banner de comunidad + estilos redondeados.
- Aviso de conexión visible **solo en vivo**.
- Iconos de la vista Configuración en blanco / consistentes.
- Íconos: de acá en adelante, UI nueva usa SVG de `interfaz/publico/icons/`,
  nunca emoji.

---

## 11. Fixes

- **Cola TTS ordenada por timestamp real**, no por orden de llegada — mensajes
  casi simultáneos de 3–4 plataformas se leen en el orden en que se escribieron.
- El spam del botón "saltar mensaje" congelaba la UI y rompía la cola — resuelto.
- La cola TTS ahora se **retoma** al reactivar el toggle global.
- YouTube: watchdog de reconexión por chat silencioso.
- Emojis en el texto del TTS: limpieza correcta.
- `admin-announce` global (avisos del creador) + moderación de Kick.
- Varios `window.*` expuestos para handlers inline (`updatePlaylistInfo`,
  `updatePlaylistInfo`).

---

## 12. Infra de desarrollo y CI

- Scripts: `npm run serve` (build + servidor sin Electron), `dev:all`
  (build-watch + servidor en watch), `build:front`.
- `launch.json` local en puerto 3000 por default.
- Suite de tests nueva: `mcp-registry`, `moderacion-store`, `moderacion-key-for`,
  `tts-fetch-audio`, `aptabase-bucket`, `install-marker`, `locales-key-parity`,
  `interfaz-compartido`, `idioma-message-matches-voice-script` (51 tests, todos
  en verde).
- CI: `scripts/check-mcp.js` (garantía de cobertura MCP), validación de paridad
  de claves i18n entre los 10 idiomas.
- `.claude/` sacado del repo.

---

## Notas de actualización

- La actualización llega automática por `electron-updater` al arrancar la app
  ("Instalar ahora / Después").
- No hay migración de datos: `config.json`, `moderation.json` y los archivos de
  `userData` son compatibles.
- El instalador sigue sin firma de código — Windows Defender puede mostrar el
  aviso habitual en la primera instalación ("Más información → Ejecutar de todas
  formas").
