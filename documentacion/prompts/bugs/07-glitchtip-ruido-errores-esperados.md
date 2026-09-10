# Bug 07 — GlitchTip: errores de conexión esperados se promueven a issue

## Contexto

GlitchTip issues 48/57/49 (`error_conexion_tiktok`, `error_reconexion_agotada`,
`error_conexion_plataforma`) y 52 (`error_conexion_youtube: Live Stream was not
found`) están dominados por casos **esperados**:

- `"The requested user isn't online :("` — el streamer configuró un canal de
  TikTok y no está en vivo. La app reintenta 5 veces y reporta el fallo.
- `"Live Stream was not found"` / `"Client Version was not found"` (YouTube) —
  mismo caso, canal sin directo activo.

No son bugs de la app: es el flujo normal cuando el usuario tiene canales
guardados que no están transmitiendo en ese momento. Pero saturan GlitchTip y
tapan los errores de conexión reales (socket muerto, sign server caído, etc).

Precedente en el repo: `sonido.tts.respuesta_pequena` y el warn de rate-limit de
Google ya se degradaron para NO promoverse a issue (quedan en la sección Logs).
Mismo patrón acá.

## Problema

`electron-shell/glitchtip.js` promueve a issue eventos de conexión que son
esperados y de alta frecuencia, generando ruido y enterrando los reales.

## Pasos para reproducir

1. Configurar un canal de TikTok o YouTube que no esté en vivo.
2. Dar "conectar".
3. Ver aparecer un issue nuevo en GlitchTip por `error_conexion_*` con `"isn't online"` / `"Live Stream was not found"`.

## Comportamiento esperado

Distinguir en `glitchtip.js` (o donde se decide promover):

- **Esperado, NO promover a issue** (queda en Logs / breadcrumbs):
  `canales.*.error` / `canales.*.conexion_fallida` / `canales.*.reconexion_fallida`
  cuyo error real matchee `"isn't online"`, `"Live Stream was not found"`,
  `"Client Version was not found"`, o el equivalente de cada plataforma para
  "el canal no está transmitiendo".
- **Real, SÍ promover:** cualquier otro error de conexión (socket, DNS del sign
  server, rate limit inesperado, decode fail, etc).

Requiere que el texto real del error esté disponible — por eso esta tarea
**depende de la tarea 03** (que arregla `err.message` → `err.exception.message`
en TikTok). Para YouTube el texto ya llega bien.

Ojo con `canales.tiktok.error … undefined`: hasta que la 03 esté hecha, el
match por texto no funciona para TikTok. Orden: 03 → 07.

## Alcance / archivos involucrados

- `electron-shell/glitchtip.js` — la lógica de `reportarIssue` / el filtro de qué se promueve (`:379-389` y alrededores).
- Posible lista de patrones "esperados" en un solo lugar (constante), no repartida.
- `electron-shell/aptabase.js` — verificar que estos eventos tampoco inflen analytics de producto de forma engañosa (probablemente ya están OK, solo confirmar).
- `test/` — si hay tests de glitchtip (`test/*glitchtip*` o similar), agregar caso: error "isn't online" NO llama a `reportarIssue`; error genérico sí.

## Criterios de aceptación

- [ ] Un `canales.tiktok.error` con `"The requested user isn't online"` NO crea issue en GlitchTip (verificable por test: `reportarIssue` no se invoca / el evento se marca no-promovible).
- [ ] Un `canales.youtube.error` con `"Live Stream was not found"` NO crea issue.
- [ ] Un error de conexión genérico (`"WebSocket Error"`, `ENOTFOUND`, etc.) SÍ crea issue.
- [ ] Los eventos degradados siguen apareciendo en la sección Logs / breadcrumbs (no se pierden, solo no son issue).
- [ ] `npm test` pasa.

## Notas / restricciones

- **Depende de la tarea 03** (texto de error real en TikTok). No empezar 07 antes de que 03 esté `hecho`.
- No degradar errores que sí importan: si `reconexion_agotada` se da por un socket muerto (no por "offline"), ese sí es señal de un problema real.
- Match por substring del mensaje, case-insensitive. Es frágil si la lib cambia el texto → comentario `ponytail:` y, si existe, preferir un `code`/`type` estructurado del error sobre el texto libre.
- Mismo archivo que parte de la tarea 06 (bajar severidad de `kick.sin_eventos`). Si 06 va primero, coordinar para no pisar el diff.
