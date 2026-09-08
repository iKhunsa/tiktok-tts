# 04 — Features Pro (lista de gating) — CONFIRMADA

Confirmada con el usuario 2026-09-08. Se seedea en la tabla `entitlements` de
Supabase (`feature_id`, `plan_id='pro'`).

## Principio

**Free = el núcleo + los overlays.** **Pro = producción, automatización y
multi-canal, y sin avisos de voz.**

Con `subscriptionsEnabled=false` (default) `entitlements.check()` devuelve `true`
para todo → la app se comporta como hoy. El gate solo aplica con el flag `true`.

## Free (núcleo — nunca gatear)

TTS (13 idiomas), chat de **1 canal por plataforma** (1 TikTok + 1 Twitch +
1 Kick + 1 YouTube pueden ir a la vez), cola TTS, badges, debounce de likes,
moderación local completa (mute/ban, palabras bloqueadas, registro de viewers,
export), filtro de idioma/diccionario, **overlays de OBS** (alertas, contadores,
subida de fondo — se rediseñan en próximas updates, por ahora libres), reporte de
bug, i18n, accesibilidad.

## Pro (gatear con `subscriptionsEnabled=true`)

| `featureId` | Qué desbloquea / cambia | Puntos de entrada (`archivo:símbolo`) |
|---|---|---|
| `bot-musical` | Bot musical (yt-dlp): `!p`, cola, playlist del streamer | `features/bot/index.js` — el `bus.on('chat:mensaje-permitido')` ya chequea `FEATURES.musicBot`; sumar `entitlements.check('bot-musical')` ahí. `features/sonido/index.js` — `bus.on('bot:comando')` + rutas `/api/music/*`. |
| `soundpad` | Soundpad (efectos con atajos y disparo remoto) | `features/sonido/index.js` — rutas `/api/soundpad/*`; `features/sonido/soundpad/shortcuts.js` — `bus.on('sonido:soundpad-reproducir')`. |
| `panel-movil` | Panel de control remoto desde el celular | `features/movil/index.js` — `app.get('/mobile', guard, …)` y `POST /api/mobile/command` (check antes de ejecutar la acción). |
| `clips` | Marca de clips en OBS (atajo `Ctrl+Shift+M` + comando móvil) | `features/clips/index.js` — `bus.on('clips:marcar')` y `bus.on('movil:comando')` (filtro `markClip`). |
| `mcp-agente` | Servidor MCP (operar la app con un agente) | `features/mcp/` — ya tiene `mcpEnabled` (config); sumar `entitlements.check('mcp-agente')` al gate `isEnabled` que usa `mountStreamableHttp`. `GET /api/mcp/info` queda abierto. |
| `multi-canal` | Conectar **2+ canales de la misma plataforma** (ej. 2 TikTok, o 2 YouTube). 1 de cada plataforma sigue siendo free. | `features/canales/index.js` — en `connect(deps)` / `platformsConnect(deps)` / `addChannel(deps)`: si la plataforma **ya tiene ≥1 canal conectado** (mirar `features/canales/state/channel-maps.js`) y `!entitlements.check('multi-canal')` → 403 `errors.proRequired`. El 1º de cada plataforma siempre pasa. |
| `sin-promos` | En Pro, los **avisos promocionales de voz** (cada 15/30 min) **NO suenan**. Gate invertido: tener el entitlement = silenciarlos. | `features/promo/index.js` — donde decide disparar un aviso (el timer / `bus.emit('sonido:hablar', …)` del promo): si `entitlements.check('sin-promos')` → **skip** (no emitir). `core/announce-texts.js` es el generador; el gate va en `features/promo/`, no ahí. |

## Notas de implementación

- El check va **una sola vez, en el punto de entrada**, nunca duplicado por
  sub-camino (regla del repo: como `features/chat/emit-chat-message.js`).
- **Fail-safe**: `entitlements.check()` que lanza → `false` (bloquea). Excepción:
  `sin-promos` es invertido — si lanza, que los avisos **sí** suenen (comportamiento
  actual). O sea `check('sin-promos')` fail-safe a `false` = "no tiene el
  entitlement" = avisos suenan. Coherente.
- **`multi-canal`**: única lógica de conteo. "≥1 canal de esa plataforma ya
  conectado" → contar en `channel-maps.js`. El gate es por-plataforma, no total.
- Ruta HTTP gateada → `res.status(403).json({ error, errorKey: 'errors.proRequired' })`.
  Handler de bus gateado → `return` temprano + `logger.log('info','auth','…','auth.gating.bloqueado', …, {featureId})`.

## Seed de `entitlements` (para el Agente 02 — vía SQL Editor del Studio)

```sql
INSERT INTO cuentas.entitlements (feature_id, plan_id) VALUES
  ('bot-musical','pro'), ('soundpad','pro'), ('panel-movil','pro'),
  ('clips','pro'), ('mcp-agente','pro'), ('multi-canal','pro'), ('sin-promos','pro')
ON CONFLICT DO NOTHING;
```
