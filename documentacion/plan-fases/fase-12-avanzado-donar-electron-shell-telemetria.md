# Fase 12 — /avanzado, /donar, /electron-shell, /telemetria

## Objetivo
Cerrar el bloque de dominios de negocio (`/avanzado`, `/donar`, mayormente placeholder/reexport) y reemplazar de una vez el `main.js`/`preload.js`/`server.js` placeholder de la raíz (Fase 0) por la versión completa de Electron, y migrar `telemetry/` archivado a `/telemetria` con los fixes de logging aplicados. Esta es la fase donde vuelve el empaquetado completo (tray, auto-updater, atajos globales).

## Referencia obligatoria
- `arquitectura-propuesta.md`, secciones `/avanzado`, `/donar`, `/electron-shell`, `/telemetria (transversal)`.
- `logging-errores-propuesta.md`, secciones `/avanzado`, `/reporte-bug` (ya cubierto en Fase 4, revisar si hay overlap con `/avanzado`), `/telemetria`, `/electron-shell`.
- `mapa-funciones-actual.md`, secciones Avanzado, Donar, Sin clasificar/infraestructura transversal (todo `main.js`, `preload.js`, `telemetry/*`).

---

## /avanzado

### Alcance
```
avanzado/
  feature-flags.js
  accesibilidad.js
  index.js
```
- `feature-flags.js` — migración de `FEATURES` (server.js:719, hoy solo `musicBot`).
- `accesibilidad.js` — reexpone los validators de `a11yReduceMotion`/`a11yUiFontScale`/`a11yHighContrast` ya definidos en `/configuracion` (Fase 2) — este dominio no duplica el store, solo agrega, si hace falta, rutas propias de UI avanzada (hoy `advanced.html` es puramente front, sin endpoints propios más allá de los ya cubiertos por `/configuracion` y `/moderacion` para palabras bloqueadas).
- `index.js` — mayormente reexport, sin lógica de negocio propia nueva.

## /donar

### Alcance
```
donar/
  index.js
```
No-op documentado: *"No existe funcionalidad real hoy. Los 'créditos de donantes' (overlayState.credits.donors) son gifts de TikTok, ya cubiertos en /overlay (Fase 8). Esta carpeta queda lista para cuando se implemente donación económica real (ej. Streamlabs/PayPal) sin tocar /overlay."* `register()` no monta nada.

---

## /electron-shell

Reemplaza los placeholders de la raíz (`main.js`/`preload.js`, Fase 0) con la versión completa.

### Alcance
```
electron-shell/
  window.js
  tray.js
  updater.js
  ipc-bridge.js
  uiohook.js
  single-instance.js
```

### Detalle
- `window.js` — migración de `createWindow`/`showMainWindow`/`waitForServer`/`retryWaitForServer`/`isAppUrl` (main.js:225/270/178/198/216).
- `tray.js` — migración de `buildTrayMenu`/`createTray`/`showStartupError` (main.js:277/300/317). Fixea main.js:312 (`console.error` suelto si la tray falla) → `electron_shell.tray.creacion_fallida` (error, con stack).
- `updater.js` — migración de `setupAutoUpdater`/`sendUpdate`/`ipcMain.on('install-update')` (main.js:414/408/472). Fixea main.js:469 (`console.error` suelto en notify) y main.js:341 (chequeo de emergencia silencioso).
- `ipc-bridge.js` — migración de `ipcMain.handle('register-tts-shortcut')`/`normalizeShortcut`/`isValidShortcut`/`unregisterTtsShortcut` (main.js:537/489/512/524), más los canales ya dejados como contrato pendiente en las Fases 9 (soundpad) y 11 (clips) — se conectan acá por primera vez de punta a punta. Fixea main.js:547 (`console.error` suelto en atajo inválido) y main.js:584/624 (registro de atajo fallido, el segundo hoy ni siquiera tiene `console.error`).
- `uiohook.js` — migración de `_makeUiohookCheck`/`registerUiohookShortcut`/`unregisterUiohookShortcut`/`startUiohook`/`stopUiohook` (main.js:77-124). Fixea main.js:119 (`console.warn` suelto en fallback a `globalShortcut`) → `electron_shell.uiohook.fallback_globalshortcut` (warn).
- `single-instance.js` — migración de `app.on('second-instance')`/`app.on('window-all-closed')` (main.js:646/651).

### server.js / main.js / preload.js (raíz, versión final)
`server.js` ya no tiene lógica propia desde la Fase 1 (solo arranca `/core` y registra los 16 dominios en el orden de este plan). `main.js` pasa a ser un orquestador delgado que importa `electron-shell/*` (igual que `server.js` orquesta dominios de negocio). `preload.js` recupera su forma completa (ya no no-op) exponiendo los canales reales de `ipc-bridge.js`.

## /telemetria

### Alcance
Migración de `backend-viejo/telemetry/` completa a `telemetria/` (mismo contenido: `index.js`, `buffer.js`, `identity.js`, `transport.js`, `creator-cache.js`, `connectors/*.js` — un conector por dominio: chat, overlay, canales/platforms, canales/creators, movil, sonido/counters, moderacion, obs, updates, errors, settings), con los fixes de `logging-errores-propuesta.md` aplicados:

- `transport.js` — fixea el punto más ciego de todo el sistema encontrado en la auditoría: hoy CUALQUIER fallo de red/servidor al enviar telemetría es 100% silencioso (incluidos los 4xx tratados como éxito). Nuevo: `telemetria.envio.exitoso`/`rechazado` (4xx ya no es éxito silencioso, se loguea `{statusHttp, bodyPreview}`)/`fallido` (con `{intentoNumero, retriesTotal, error, stack}` en cada intento, incluido el final).
- `buffer.js` — fixea cola corrupta/persistencia fallida silenciosa → `telemetria.buffer.corrupto`/`persistencia_fallida`.
- `creator-cache.js` — fixea resolución de perfil fallida silenciosa (indistinguible hoy de "resuelto sin perfil") → `telemetria.creator_cache.resolucion_fallida`.
- `index.js` — fixea `console.error` sueltos en `init()` y enganche de conectores (main.js hoy los usa así) → `telemetria.init.fallido`/`telemetria.conector.enganche_fallido`.
- Cada dominio de negocio (chat, overlay, canales, etc.) ya construido en fases anteriores importa su propio conector de `telemetria/connectors/` y llama `telemetria.track(...)` — un fallo de red en telemetría no puede tumbar ningún dominio (ya garantizado por el try/catch interno + no-op si falla init, comportamiento preservado del backend viejo).

## Criterios de aceptación
1. `npm run build:electron` genera un instalador NSIS funcional (primera vez que se corre el build completo desde la Fase 0).
2. Tray, auto-updater, atajos globales (TTS pause/skip/clear, soundpad, clip) funcionan igual que en `backend-viejo/`.
3. Empaquetado (`app.isPackaged`) resuelve `TIKTOK_RESOURCES_PATH`/`userData` igual que antes (vía `core/paths.js` de la Fase 1) — `gifts/`, `blocked-words.md`, `tray-icon.ico` (archivados en `backend-viejo/` en la Fase 0) deben reincorporarse a `build.extraResources` de `package.json` en esta fase, apuntando a donde corresponda (revisar si se recuperan del archivo o se regeneran).
4. Telemetría reporta eventos reales a un endpoint de prueba (`telemetria.json` de test), incluyendo un caso forzado de servidor caído — confirmar que ahora SÍ queda `telemetria.envio.fallido` en el log (hoy no queda nada).
5. Todos los dominios de negocio (Fases 2-11) siguen funcionando exactamente igual con `/telemetria` conectada — ningún fallo de telemetría bloquea ninguna funcionalidad.

## Riesgos
- Es la fase que reintroduce más superficie de Electron nativo (uiohook, tray, auto-updater) — probar en Windows real (no solo `npm run electron` en dev), ya que varios de estos mecanismos (atajos globales, tray) dependen de comportamiento de SO.
- `package.json > build.extraResources` necesita reincorporar rutas que en la Fase 0 se quitaron/apuntaron a `backend-viejo/` — revisar con cuidado para no dejar el instalador final empaquetando desde la carpeta archivada (que se borra en la Fase 13).
