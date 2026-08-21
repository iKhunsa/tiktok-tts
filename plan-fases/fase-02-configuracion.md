# Fase 2 — /configuracion

## Objetivo
Único dominio dueño de `config.json` y `platform-config.json`. Sin dependencias funcionales de otros dominios de negocio (solo de `/core`) — todos los demás dominios leen su snapshot vía contrato, nunca importan el store directo.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/configuracion` — lista de archivos y el contrato: *"único dominio que escribe config.json. Otros dominios leen config solo via bus.emit('config:get') síncrono o snapshot inyectado en cada bus event — nunca importan config/store.js directo."*
- `logging-errores-propuesta.md`, sección `/configuracion` — eventos `configuracion.patch.aplicado`, `configuracion.patch.rechazado`, `configuracion.store.guardado`/`guardado_fallido`/`cargado`/`claves_invalidas_ignoradas`/`carga_fallida`, `configuracion.platform.guardado_fallido`/`carga_fallida`.
- `logging-errores-propuesta.md`, regla dura #5: **nunca loguear el objeto config completo** — fixea server.js:701 y server.js:2153, que hoy loguean `config` entero en texto plano incluyendo `adminIdentities` (lista de usernames admin) en cada carga y cada PATCH. Este es el único hallazgo de fuga de dato sensible de toda la auditoría — prioridad alta en esta fase.
- `mapa-funciones-actual.md`, sección Configuracion — comportamiento exacto a preservar: `DEFAULT_CONFIG`/`CONFIG_VALIDATORS` (server.js:606-668), `applyConfigPatch` (server.js:670), `saveConfig`/`loadConfig` (server.js:687/695), `savePlatformConfig`/`loadPlatformConfig` (server.js:2550/2558), rutas `GET/PATCH /api/config` (server.js:2142/2144), `GET/PATCH /api/platform-config` (server.js:3322/3326), `GET /api/status` (server.js:1918), endpoints de logs de diagnóstico (server.js:1930-2022).

## Alcance — archivos a crear

```
configuracion/
  default-config.js
  validators.js
  apply-patch.js
  store.js
  platform-config-store.js
  routes/
    get-config.js
    patch-config.js
    get-platform-config.js
    patch-platform-config.js
    get-status.js
    get-logs.js
    post-client-log.js
    get-session-log-file.js
    get-logs-download-all.js
  logs/
    read-file-tail.js
    read-session-log-entries.js
    entries-to-markdown.js
  index.js
```

## Detalle por archivo

### default-config.js / validators.js
Migración 1:1 de `DEFAULT_CONFIG` y `CONFIG_VALIDATORS` (server.js:606-668). Copiar cada clave y su validador exacto — incluye `ttsVoiceLang`, `ttsSlowSpeech`, `a11yReduceMotion`, `a11yUiFontScale`, `a11yHighContrast`, `adminIdentities`, etc. No agregar ni quitar claves en esta fase — es una migración de comportamiento, no un rediseño de config.

### apply-patch.js — applyConfigPatch(input)
Misma lógica que server.js:670: valida cada clave del patch contra `CONFIG_VALIDATORS`, junta las rechazadas en `rejected`, aplica solo las válidas. Emite `configuracion.patch.aplicado` con `{keysChanged: Object.keys(patchAplicado)}` (nunca los valores) y, si hubo rechazadas, `configuracion.patch.rechazado` con `{rejected}`.

### store.js — saveConfig/loadConfig
Mismo path `DATA_BASE/config.json` (vía `core/paths.js` de la Fase 1). Eventos:
- `configuracion.store.guardado` `{path}`
- `configuracion.store.guardado_fallido` (error, con `stack` automático vía `core/logger.js`) — fixea server.js:691 que hoy loguea sin stack
- `configuracion.store.cargado` `{keysCount}` — **nunca** el objeto config completo (fix del hallazgo de fuga)
- `configuracion.store.claves_invalidas_ignoradas` (warn) `{rejected}`
- `configuracion.store.carga_fallida` (warn) `{path, error}` — cae a `DEFAULT_CONFIG`, igual que hoy

### platform-config-store.js
Mismo patrón para `platform-config.json` (clientId de Twitch): `configuracion.platform.guardado_fallido`/`carga_fallida` con `{error, stack}`/`{error}`.

### routes/*.js
Cada ruta HTTP actual pasa a ser un archivo propio:
- `get-config.js` — `GET /api/config`
- `patch-config.js` — `PATCH /api/config`, aplica patch, guarda, `bus.emit('config:actualizado', {keysChanged})` (reemplaza el `broadcast('config-updated')` actual — otros dominios que necesiten reaccionar a cambios de config se suscriben a este evento en vez de leer el archivo)
- `get-platform-config.js` / `patch-platform-config.js`
- `get-status.js` — healthcheck; **decidir en esta fase** qué campos de config expone (hoy expone la config completa, server.js:1918 — revisar si hay que filtrar `adminIdentities` también aquí antes de responder al cliente, ya que este endpoint es accesible desde el front)
- `get-logs.js`, `post-client-log.js`, `get-session-log-file.js`, `get-logs-download-all.js` — mismos endpoints de diagnóstico actuales (server.js:1930-2022), reescritos sobre `core/logger.js` en vez del buffer `serverLogs` viejo

### logs/*.js
`read-file-tail.js`, `read-session-log-entries.js`, `entries-to-markdown.js` — utilidades puras, migración directa de server.js:1948/1962/1973.

### index.js
`register({app, bus, logger})`: monta las rutas de arriba. No se suscribe a nada del bus (es fuente de verdad, no consumidor). Expone el contrato de lectura: `bus.on('config:get', (respond) => respond(snapshotActual))` o inyección directa de un objeto congelado — a decidir en implementación cuál patrón usa `core/register-domain.js` para pasarlo a los demás dominios (revisar si conviene que `core` resuelva esto como un contrato más en `core/contracts/`, análogo a `moderacion-policy`).

## Criterios de aceptación
1. `GET /api/config` devuelve la misma forma de objeto que el backend viejo para un `config.json` de prueba idéntico.
2. `PATCH /api/config` con claves inválidas responde igual (`400 'Config invalida'` con `{rejected}`) y **no** persiste las claves rechazadas.
3. Cargar un `config.json` real exportado del backend viejo (`backend-viejo/`) — debe leerse sin error y sin perder ninguna clave existente.
4. Grep del log de sesión generado en una corrida de prueba: cero apariciones de `adminIdentities` con valores reales, cero apariciones del objeto config completo serializado.
5. `PATCH` dispara `bus.emit('config:actualizado', ...)` — confirmable con un listener de debug temporal.

## Riesgos
- Si algún dominio futuro necesita leer config de forma síncrona en el hot path (ej. `/chat` decidiendo si TTS está activo por cada mensaje), el patrón `bus.emit('config:get')` async puede no alcanzar — evaluar si `/configuracion` debe exponer también un objeto de snapshot mutable-pero-de-solo-lectura inyectado directo (más simple, menos "puro" en términos de bus) en vez de forzar todo por evento. Documentar la decisión final en el `index.js` de este dominio para que las fases siguientes la sigan.
