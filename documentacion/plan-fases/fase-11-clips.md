# Fase 11 — /clips

## Objetivo
El dominio más chico del rebuild — buen caso de validación final del patrón de "contrato síncrono inyectado vs evento de bus" antes de cerrar el bloque de dominios de negocio. Marca clip en OBS al presionar Ctrl+Shift+M.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/clips` — contrato: *"Clips no conoce el protocolo OBS WS — solo pide 'guarda replay' al bus; Canales/obs lo ejecuta."*
- `logging-errores-propuesta.md`, sección `/clips` — eventos `clips.marcado.solicitado`/`exitoso`/`fallido`.
- `mapa-funciones-actual.md`, sección Clips — atajo global (server.js/main.js, uiohook o `globalShortcut` fallback), `POST /api/obs/save-replay` (ya migrado a `/canales/obs/save-replay.js` en la Fase 6), comando móvil `markClip`/`deleteClip` (server.js:3806-3829, ya cubierto por `/movil/allowed-actions.js` en la Fase 8).

## Alcance — archivos a crear

```
clips/
  global-shortcut.js
  mark-clip.js
  index.js
```

## Detalle

### global-shortcut.js
Registra el atajo Ctrl+Shift+M. Depende de `/electron-shell` para el registro real de teclado global (uiohook-napi o `globalShortcut` de Electron como fallback) — como `/electron-shell` recién se construye en la Fase 12, esta fase define el contrato de IPC (`ipcRenderer`/`ipcMain` canal `clips:marcar`) que se conecta después, análogo a lo dejado pendiente para soundpad en la Fase 9.

### mark-clip.js
Al dispararse el atajo (o el comando `markClip` desde `/movil`), emite `bus.emit('clips:marcar')`. Log: `clips.marcado.solicitado` (info) `{origen: 'atajo-teclado'|'mobile'}`.

### index.js
`register({bus})`: `bus.on('clips:marcar', async () => {...})` → pide a `/canales` que guarde el replay. Dos formas posibles, a decidir en implementación siguiendo el patrón ya usado en `moderacionPolicy`:
- **Opción A (evento de bus):** `bus.emit('canal:obs:guardar-replay')`, `/canales/obs/save-replay.js` (Fase 6) escucha y ejecuta.
- **Opción B (contrato síncrono inyectado):** análogo a `moderacionPolicy`, el core inyecta un objeto `obsContract.saveReplay()` que `/canales` expone.

Documentado en `arquitectura-propuesta.md` como evento de bus (Opción A) — usar esa por defecto salvo que en la implementación real se detecte que se necesita saber el resultado (éxito/fallo) de forma síncrona para responder al usuario, en cuyo caso conviene la Opción B.

Eventos: `clips.marcado.exitoso` (info), `clips.marcado.fallido` (error, con stack) — propagado desde `canales.obs.replay_fallido` (Fase 6), pero `/clips` emite su propio evento porque el usuario percibe el fallo desde el atajo de teclado, no desde OBS internamente.

## Criterios de aceptación
1. Ctrl+Shift+M marca clip en OBS igual que antes (requiere OBS conectado, dependencia de la Fase 6 ya funcionando).
2. Comando `markClip` desde el panel móvil (`/movil`, Fase 8) dispara el mismo flujo.
3. Con OBS desconectado, el atajo no crashea nada — `clips.marcado.fallido` se loguea con el motivo real (`canales.obs.no_conectado` propagado).
4. Confirmar que `clips/index.js` no importa nada de `canales/obs/` directo (`require`) — solo se comunica vía el bus/contrato elegido.

## Riesgos
- El registro real del atajo global depende de `/electron-shell` (Fase 12, todavía no construida en este punto) — esta fase deja el contrato listo pero la prueba end-to-end completa del atajo de teclado físico solo se puede hacer después de la Fase 12. Documentar como pendiente de verificación cruzada, no como bug de esta fase.
