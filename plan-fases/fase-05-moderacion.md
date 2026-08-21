# Fase 5 — /moderacion

## Objetivo
Único dueño de `moderation.json` y `blocked-words.md`. Implementa el contrato síncrono `moderacionPolicy.evaluate(msg)` que `/chat` (Fase 7) va a depender directamente — es la pieza de acoplamiento fuerte más importante de todo el rebuild, porque decidir si un mensaje se lee por TTS no se puede resolver de forma puramente asíncrona vía bus (el orden importa: primero se sabe si está baneado, después se decide todo lo demás).

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/moderacion` — lista completa de archivos y el contrato con `/chat`: interfaz `evaluate(msg) → {isSpam, isMuted, isBanned, isFollower}`, definida en `core/contracts/moderacion-policy.js` (Fase 1), implementada acá, inyectada por el core en `/chat`. **Fail-open documentado**: si `evaluate()` lanza, el mensaje se trata como no-spam para no silenciar el chat entero por un bug de este dominio.
- `logging-errores-propuesta.md`, sección `/moderacion` — TODOS los eventos `moderacion.store.*`, `moderacion.filtro.*`, `moderacion.policy.*`, `moderacion.accion.*`, `moderacion.palabras.*`. Prestar atención especial a `moderacion.filtro.mensaje_bloqueado`, que debe llevar SIEMPRE `{platform, userId, nick, key, motivo}` — es el hallazgo más citado por el usuario como "dato a medias" (hoy server.js:1409/1415/1497/1505 mandan solo `{reason}` sin decir a quién se le bloqueó el mensaje).
- `mapa-funciones-actual.md`, secciones Moderacion (server.js) y moderation-store.js — inventario función por función completo, incluye las 25 funciones del store (`createModerationStore`, `keyFor`/`parseKey`, `flush`, `backupAndReset`, `load`, `normalizeRecord`, `purge`, `sweepExpired`, `ensure`, `touch`, `markFollower`, `get`, `getEffective`, `toDTO`, `list`, `stats`, `mutate`, `setMute`/`setBan`, `clearPunishments`, `setWhitelist`, `remove`/`clearAll`, `shutdown`) y los filtros de chat (`isSpam`, `moderationStage`, `isDuplicateRecent`, `normalizeAggressive`, blocked-word matchers).

## Alcance — archivos a crear

```
moderacion/
  store/
    create-store.js
    key-for.js
    parse-key.js
    flush.js
    load.js
    backup-and-reset.js
    normalize-record.js
    purge.js
    sweep-expired.js
    ensure.js
    touch.js
    mark-follower.js
    get.js
    get-effective.js
    to-dto.js
    list.js
    stats.js
    mutate.js
    set-mute.js
    set-ban.js
    clear-punishments.js
    set-whitelist.js
    remove.js
    clear-all.js
    shutdown.js
  filters/
    is-spam.js
    moderation-stage.js
    is-duplicate-recent.js
    normalize-aggressive.js
    blocked-matchers.js
    blocked-words-file.js
  policy.js
  routes/
    preview.js
    viewers.js
    stats.js
    mute.js
    unmute.js
    ban.js
    unban.js
    clear.js
    follower.js
    delete-viewer.js
    delete-all-viewers.js
    blocked-words-get.js
    blocked-words-export.js
    blocked-words-import.js
    block-word.js
    unblock-word.js
  index.js
```

## Detalle por archivo (agrupado)

### store/*.js
Migración 1:1 de `moderation-store.js` completo (503 líneas), UN archivo por función en vez de un solo módulo factory. Mantener EXACTO el esquema de `moderation.json`: clave `${platform}:${id}` (o `${platform}:name:${nick}` con `idk:'name'` si no hay id estable — las dos formas nunca se fusionan, comportamiento a preservar tal cual), los dos ejes ortogonales `mute`/`ban` (valores `0`/`-1`/epoch ms), expiración perezosa (nunca `setTimeout` por usuario), debounce de escritura de 15s (techo 60s) con flush inmediato en acciones de moderación, `writeFileSync` a `.tmp`+`rename`, cap de 5000 con purga LRU a 4000 que preserva seguidores/whitelist/castigados vivos.

Eventos (ya definidos en logging-errores-propuesta.md, mapeo directo función→evento):
- `flush.js` → `moderacion.store.guardado`/`guardado_fallido` (con stack automático)
- `backup-and-reset.js` → `moderacion.store.apartado_por_corrupcion`/`backup_fallido` (fatal si el backup mismo falla — doble fallo)
- `load.js` → `moderacion.store.cargado`/`lectura_fallida`
- `purge.js` → `moderacion.store.limite_alcanzado`/`purgado`
- `sweep-expired.js` → `moderacion.store.castigos_expirados` — evento NUEVO, hoy este barrido periódico (cada 15 min) no tenía ningún log propio.

### filters/*.js
Migración de la lógica de chat/moderación compartida (hoy vive en server.js, no en moderation-store.js): `isSpam` (server.js:1405), `moderationStage` (server.js:1388, usada tanto por el chat real como por `/api/moderation/preview`), `isDuplicateRecent` (server.js:1366), `normalizeAggressive` (server.js:1323, leet-speak folding), matchers de palabras bloqueadas (`getBlockedMatchers`/`invalidateBlockedMatchers`, server.js:1343/1341), `blocked-words-file.js` (load/save de `blocked-words.md`, server.js:1197/1219).

`filters/moderation-stage.js` depende del contrato `idioma.filtrar()` de la Fase 3 (filtro de idioma es parte de `moderationStage` hoy) — importarlo vía `core/contracts/idioma-filtrar.js`, nunca `require('../../idioma/...')` directo.

Eventos:
- `moderacion.filtro.mensaje_bloqueado` (info) — **obligatorio** `{platform, userId, nick, key, motivo: 'longitud'|'char-repetido'|'palabra-bloqueada'|'script'|'dict'|'duplicado'|'user-banned'|'user-muted'}`
- `moderacion.filtro.palabra_bloqueada` (info) `{platform, userId, nick, palabra}`
- `moderacion.palabras.cargado`/`carga_fallida`/`guardado`/`guardado_fallido`/`export_fallido` (todos con stack en los `_fallido`)

### policy.js — evaluate(msg)
Implementa la interfaz de `core/contracts/moderacion-policy.js`. Internamente: `store.getEffective(key)` + `filters/is-spam.js` + `filters/moderation-stage.js`. Envuelto en try/catch propio (aparte del error-boundary genérico de `/core`, porque acá el fail-open es semántico, no solo "no tumbar el proceso"): si algo lanza, retorna `{isSpam: false, isMuted: false, isBanned: false, isFollower: false}` (fail-open) y emite `moderacion.policy.fallo_evaluacion` (error, con stack) — este evento es la ÚNICA forma de saber que el fail-open se activó, así que su ausencia de logs no puede pasar desapercibida.

### routes/*.js
Migración 1:1 de los 16 endpoints actuales (`preview`, `viewers`, `stats`, `mute`, `unmute`, `ban`, `unban`, `clear`, `follower`, `delete-viewer`, `delete-all-viewers`, `blocked-words` GET/export/import, `block-word`/`unblock-word`). Cada uno usa el wrapper `applyModAction` migrado (server.js:2201) y valida contra `isAdminTarget` (server.js:2196) antes de aplicar — con evento nuevo `moderacion.accion.target_admin_rechazado` (warn) que fixea el 403 actual (server.js:2205) que hoy no deja log server-side.

### index.js
`register({app, bus})`:
- Monta las 16 rutas.
- `bus.on('canal:mensaje-crudo', ...)` → `store.touch()` (registra interacción).
- `bus.on('canal:follow', ...)` → `store.markFollower()`.
- Expone `policy.evaluate` al core (`core.provideContract('moderacionPolicy', policy)`), consumido por `/chat` en la Fase 7.
- `shutdown()` propio: `store.flush()` final + detener el timer de `sweep-expired`.

## Criterios de aceptación
1. Cargar un `moderation.json` real exportado de `backend-viejo/` — debe leerse sin disparar `backup-and-reset` (mismo esquema de versión/formato compacto), y `list()`/`stats()` deben dar resultados idénticos byte a byte comparados con una corrida equivalente del store viejo.
2. Simular 100 mensajes de prueba con distintos motivos de bloqueo (spam, palabra bloqueada, duplicado, banned, muted) — cada uno debe generar `moderacion.filtro.mensaje_bloqueado` con el `motivo` correcto y el `userId`/`nick` correctos (no solo `{reason}` genérico como hoy).
3. Forzar una excepción dentro de `policy.evaluate()` (mock temporal) — confirmar fail-open: el mensaje de prueba se trata como permitido, y `moderacion.policy.fallo_evaluacion` aparece en el log.
4. Cap de 5000 viewers + purga a 4000: crear 5001 registros de prueba, incluir algunos con castigo vivo y algunos seguidores — confirmar que la purga nunca descarta esos, igual que el comportamiento actual.
5. Debounce de escritura: hacer 20 `touch()` seguidos en menos de 15s — debe generar un solo `flush` real, no 20.

## Riesgos
- Es la fase con más superficie de comportamiento a preservar exactamente (25 funciones de store + 6 de filtros). Recomendado: escribir un script de comparación automatizado que corra el store viejo y el nuevo contra el mismo set de eventos sintéticos y diffe el `moderation.json` resultante, antes de dar la fase por cerrada.
- El fail-open de `policy.evaluate()` es una decisión de producto (mensajes pasan si moderación falla) — confirmar con el usuario que sigue siendo el comportamiento deseado antes de implementarlo, ya que en la reconstrucción es la primera vez que queda formalizado como contrato explícito en vez de ser un efecto colateral del monolito.
