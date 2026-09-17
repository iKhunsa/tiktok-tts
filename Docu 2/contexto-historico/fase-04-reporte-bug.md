# Fase 4 — /reporte-bug

## Objetivo
Dominio aislado, único que sabe hablar con el webhook de Discord. Se construye AHORA (antes de moderación/canales/chat) a propósito: desde este punto en adelante, cualquier fallo de las fases siguientes ya queda capturado y reportable, porque este dominio se suscribe a los eventos de error globales del core desde el día uno.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/reporte-bug` — contrato: *"único punto que sabe hablar con Discord webhook y con telemetry/connectors/errors.js."*
- `logging-errores-propuesta.md`, sección `/reporte-bug` — eventos `reporte_bug.webhook.no_configurado`, `reporte_bug.discord.enviado`/`intento_fallido`/`envio_fallido`, `reporte_bug.error_uncaught.capturado`, `reporte_bug.error_handled.recibido`, `reporte_bug.limite_sesion_alcanzado`.
- `mapa-funciones-actual.md`, sección Reporte-bug — funciones a migrar: `getBugReportWebhookUrl` (server.js:177), `sendDiscordAttempt`/`postToDiscordWebhook` (server.js:2039/2061), `POST /api/report-bug` (server.js:2093), `getCurrentSessionLogPath` (server.js:165), retención de logs al arrancar (server.js:143-153), `process.on('uncaughtException'/'unhandledRejection')` (equivalentes ya migrados a `/core` en la Fase 1, este dominio solo escucha).

## Alcance — archivos a crear

```
reporte-bug/
  webhook-url.js
  discord/
    send-attempt.js
    post-webhook.js
  routes/
    report-bug.js
  session-log-path.js
  retention-sweep.js
  error-listeners.js
  index.js
```

## Detalle por archivo

### webhook-url.js — getBugReportWebhookUrl()
Migración de server.js:177. Lee `webhook-config.json` (`RESOURCE_BASE`/`DATA_BASE` vía `core/paths.js`). Fixea el hallazgo de logging-errores-propuesta.md: hoy si falta el webhook, server.js:2108 loguea `'webhook no configurado'` **sin decir por qué**. Nueva versión distingue y loguea `reporte_bug.webhook.no_configurado` (warn) con `{motivo: 'archivo-inexistente'|'json-corrupto'|'url-vacia'}` — el `motivo` exacto se determina en esta misma función (try/catch separado para "no existe" vs "existe pero no parsea" vs "parsea pero está vacío").

### discord/send-attempt.js — sendDiscordAttempt(webhookUrl, embed, logFilePath, capBytes)
Migración de server.js:2039. Un intento con un tamaño de adjunto dado. Log por intento (esto es nuevo, hoy NO existe): `reporte_bug.discord.intento_fallido` (warn) con `{intentoNumero, capBytesIntentado, statusHttp, error}` — fixea server.js:2076, donde la escalera de intentos decrecientes de tamaño no deja rastro de los intentos intermedios, solo del resultado final.

### discord/post-webhook.js — postToDiscordWebhook(webhookUrl, embed, logFilePath)
Migración de server.js:2061, orquesta la escalera de `send-attempt.js` con tamaños decrecientes. Éxito: `reporte_bug.discord.enviado` (info) `{discordNick, channelLink, attached, attachedBytes}`. Fallo total tras agotar la escalera: `reporte_bug.discord.envio_fallido` (error, con stack).

### routes/report-bug.js — POST /api/report-bug
Migración de server.js:2093. Mismas validaciones (`400 'Faltan campos requeridos'`, `429 'Espera unos segundos...'`, `503` si no hay webhook configurado — este último ahora referenciando el `motivo` explícito del punto anterior).

### session-log-path.js — getCurrentSessionLogPath()
Migración de server.js:165. Depende de que `/core` (Fase 1) ya tenga resuelto dónde vive el archivo de sesión activo — este archivo solo expone el path, no lo gestiona (eso es responsabilidad de `core/logger.js`).

### retention-sweep.js
Migración del barrido de logs viejos al iniciar (server.js:143-153). Hoy sus `catch` son completamente silenciosos (`catch (_) {}` en server.js:151/153) — nueva versión loguea `reporte_bug.retencion.archivo_no_borrado` (warn, nombre de evento nuevo, no estaba en el análisis original pero se deriva de la regla dura #3 de logging-errores-propuesta.md: "ningún catch queda mudo") con `{path, error}` si falla borrar/leer un log antiguo.

### error-listeners.js
Se suscribe a `bus.on('error:handled', ...)` y `bus.on('error:uncaught', ...)` (emitidos por `core/logger.js` y `core/error-boundary.js` desde la Fase 1). Reenvía a Discord (si aplica, según configuración de severidad) y a telemetría (Fase 12). Eventos propios:
- `reporte_bug.error_uncaught.capturado` (fatal) `{where, message, stack}` — documenta explícitamente que el proceso **sigue vivo** tras esto (decisión ya tomada en el backend actual, se preserva pero ahora queda registrada como decisión consciente, no como omisión).
- `reporte_bug.error_handled.recibido` (debug) `{domain, function, event}` — traza de que el pipeline error-boundary → reporte-bug está vivo end-to-end; útil para confirmar en cada fase siguiente que los errores de un dominio nuevo efectivamente llegan hasta acá.
- `reporte_bug.limite_sesion_alcanzado` (warn) `{max: 50}` — fixea telemetry/connectors/errors.js actual, que hoy descarta el evento 51+ de la sesión sin ningún aviso.

### index.js
`register({app, bus})`: monta la ruta, arranca `retention-sweep.js` al iniciar, engancha `error-listeners.js` al bus.

## Criterios de aceptación
1. Con un dominio de prueba (ej. el mismo usado para testear `core.dominio.fallo_montaje` en la Fase 1) forzando un error real, confirmar que llega hasta `reporte_bug.error_handled.recibido` en el log.
2. `POST /api/report-bug` con webhook configurado en un canal de prueba de Discord — el mensaje llega con el log de sesión adjunto, igual que en el backend viejo.
3. Simular una escalera completa de fallos de envío (mockear la URL del webhook a una que responda 413 siempre) — confirmar que aparecen múltiples `reporte_bug.discord.intento_fallido` antes del `envio_fallido` final (hoy esto es invisible).
4. Borrar el `webhook-config.json` de prueba y confirmar que `reporte_bug.webhook.no_configurado` indica `motivo: 'archivo-inexistente'` exacto (no un mensaje genérico).

## Riesgos
- Este dominio depende de que `/core` (Fase 1) ya emita `error:handled`/`error:uncaught` correctamente tipados — si la Fase 1 quedó con algún hueco en la extracción automática de `stack`, se hereda acá. Verificar la Fase 1 antes de dar esta por cerrada.
