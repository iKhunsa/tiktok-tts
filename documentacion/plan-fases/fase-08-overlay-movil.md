# Fase 8 — /overlay y /movil (en paralelo)

## Objetivo
Ambos son consumidores puros de eventos ya publicados por `/canales` (Fase 6) y `/chat` (Fase 7) — no tienen dependencia funcional entre sí, por eso se construyen en la misma fase/turno pero como dos dominios independientes.

## Referencia obligatoria
- `arquitectura-propuesta.md`, secciones `/overlay` y `/movil` — contratos: Overlay *"es puramente consumidor + transformador de estado visual. No escribe en moderation.json ni en config.json."* Movil *"es un espejo de solo lectura del estado + un traductor de comandos hacia el bus. No conoce lógica interna de otros dominios."*
- `logging-errores-propuesta.md`, secciones `/overlay` y `/movil` — eventos `overlay.followers.*`, `overlay.gift.*`, `overlay.fondo.*`, `overlay.test.*`, `movil.acceso.*`, `movil.emparejado`, `movil.comando.*`, `movil.qr.*`.
- `mapa-funciones-actual.md`, secciones Overlay y Movil.

---

## /overlay

### Alcance — archivos a crear
```
overlay/
  state/
    overlay-state.js
    reset.js
    recompute-follower-base.js
    set-follower-base.js
    extract-follower-count.js
    follower-refresh-timer.js
  compute-gift-usd.js
  routes/
    overlay-stats.js
    gifts-list.js
    upload-bg.js
    delete-bg.js
    test-gift.js
    test-follow.js
    test-share.js
    test-sub.js
    test-cheer.js
    test-raid.js
    test-likes.js
  index.js
```

### Detalle
- `state/overlay-state.js`/`reset.js` — migración de `overlayState`/`resetOverlayState` (server.js:947/963).
- `recompute-follower-base.js`/`set-follower-base.js` — migración de server.js:976/988.
- `extract-follower-count.js` — migración de server.js:1037.
- `follower-refresh-timer.js` — migración del timer de 5 min (server.js:1047/1072). Eventos: `overlay.followers.base_recalculada`, `overlay.followers.refrescado`/`refresco_fallido` (este último ahora con `stack` automático, fixea server.js:1066 que hoy no lo incluía).
- `compute-gift-usd.js` — migración EXACTA de `computeGiftUsd` (server.js:570), misma tabla `TIKTOK_GIFT_COINS` (server.js:289-562) — este archivo determina cuánto vale un regalo en USD, cualquier desviación cambia lo que ve el streamer en overlay. Evento nuevo: `overlay.gift.valor_desconocido` (warn) si un regalo no tiene mapping — hoy este caso se ignora/valora en 0 sin ningún aviso.
- `routes/*.js` — migración 1:1 de los 11 endpoints (server.js:2326-2518), incluidas las 7 rutas `/api/test/*` que hoy tienen formatos de log distintos entre sí — unificadas bajo `overlay.test.disparado` `{tipo, payload}`.
- `index.js` — `register({app, bus})`: `bus.on('canal:gift'|'canal:follow'|'canal:like'|'canal:sub'|'canal:cheer'|'canal:raid', ...)` y `bus.on('chat:mensaje-permitido', ...)` (para badges en overlay de chat) → transforma y `bus.emit('overlay:actualizar', payload)` (el core lo traduce a WS broadcast vía `core/broadcast.js` de la Fase 1).

---

## /movil

### Alcance — archivos a crear
```
movil/
  state/
    mobile-state.js
  allowed-ws-client.js
  validate-request.js
  local-ip.js
  routes/
    mobile-page.js
    local-ip.js
    qr.js
    state.js
    command.js
  has-desktop-client.js
  allowed-actions.js
  index.js
```

### Detalle
- `state/mobile-state.js` — migración de `mobileState` (server.js:87-107).
- `allowed-ws-client.js` — migración de `isAllowedWsClient` (server.js:109), reusa `core/security/is-private-ip.js` de la Fase 1.
- `validate-request.js` — migración de `validateMobileRequest` (server.js:251), middleware de IP privada. Fixea server.js:254: hoy responde `400 'Solo acceso desde red local'` sin loguear qué IP se rechazó → nuevo `movil.acceso.rechazado` (warn) `{ip, motivo}`. También dispara `movil.emparejado` (info) `{ip}` una vez por sesión (fixea telemetryBus 'mobile:paired' sin payload hoy).
- `local-ip.js` — migración de `getLocalIPCandidates`/`getLocalIP` (server.js:51/70).
- `routes/mobile-page.js` — `GET /mobile`.
- `routes/local-ip.js` — `GET /api/local-ip`.
- `routes/qr.js` — `GET /api/mobile/qr`, `QRCode.toBuffer`. Fixea server.js:3720 (hoy solo responde HTTP sin loguear el fallo) → `movil.qr.generado`/`generacion_fallida` (con stack).
- `routes/state.js` — `GET /api/mobile/state`.
- `routes/command.js` — `POST /api/mobile/command`, valida contra `allowed-actions.js` (migración de `MOBILE_ALLOWED_ACTIONS`, server.js:3806-3829). Fixea el 400 `'Acción no válida'` mudo hoy → `movil.comando.no_valido` (warn). Comandos entrantes se re-emiten como `bus.emit('movil:comando', cmd)` — `/canales`, `/sonido`, `/clips` se suscriben, nunca `/movil` llama funciones de otro dominio directo.
- `has-desktop-client.js` — migración de server.js:3812. Si un comando requiere cliente desktop y no hay ninguno → `movil.comando.sin_desktop` (warn).
- `index.js` — `register({app, wss, bus})`: monta rutas, `bus.on('*', mirrorRelevantEventsToMobileState)` para mantener `mobileState` sincronizado (espejo de solo lectura de lo que pasa en otros dominios).

## Criterios de aceptación
1. `/overlay`: los 7 archivos HTML `overlay-*.html` del front (sin cambios de código, siguen conectándose por WS a `location.host`) reciben las mismas actualizaciones en tiempo real que con el backend viejo — probar gift/follow/like/sub/cheer/raid reales o vía las rutas `/api/test/*`.
2. `/overlay`: subir y borrar una imagen de fondo personalizada funciona igual.
3. `/movil`: escanear el QR desde un celular en la misma red, el panel `/mobile` carga y muestra estado en tiempo real.
4. `/movil`: enviar un comando desde el panel (ej. `markClip`, `skip` de música) — llega al dominio correspondiente vía `movil:comando` (una vez esos dominios existan; hasta la Fase 11/9 esto se puede validar solo con un listener de debug).
5. Intentar acceder a `/mobile` o `/api/mobile/*` desde una IP no privada (simulada) — debe rechazar y loguear `movil.acceso.rechazado` con la IP real.

## Riesgos
- `/overlay` depende de que `/canales` (Fase 6) emita `canal:gift`/`canal:follow`/etc. con el payload exacto esperado (mismos campos que los objetos actuales de `tiktok-live-connector`/`tmi.js`) — si el payload cambió de forma en la Fase 6, `compute-gift-usd.js` puede fallar silenciosamente al no encontrar campos esperados. Validar contra datos reales de la Fase 6 antes de dar esta fase por cerrada.
- `/movil` depende de comandos hacia dominios que todavía no existen en este punto del plan (`/sonido` es Fase 9, `/clips` es Fase 11) — los comandos de música/clips desde el móvil no se pueden probar end-to-end hasta esas fases; documentar como pendiente, no como bug de esta fase.
