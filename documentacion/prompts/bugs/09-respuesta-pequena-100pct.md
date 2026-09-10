# Bug 09 — `sonido.tts.respuesta_pequena` dispara en el 100% de las síntesis

## Contexto

En los 3 logs de producción, el warning `sonido.tts.respuesta_pequena` / "Small
audio response" aparece **una vez por cada `sonido.tts.hablado` / "Google
response"** — 10.759, 6.770, 4.399 veces respectivamente, siempre con
`{"len":0}` (o `{"len":0,"contentType":"audio/mpeg"}` en el schema viejo).

Contexto de diseño: Google Translate TTS rate-limitea devolviendo `200` + body
vacío, y `features/sonido/tts/fetch-audio.js` tiene lógica para detectar eso
(retry, backoff). El warning `respuesta_pequena` es parte de esa detección. Pero
está disparando en TODAS las respuestas, incluidas las que sí traen audio
(porque `sonido.tts.hablado` con `bytes: 24000` etc. aparece justo después).

Hipótesis (a confirmar sobre el código): el largo del body se lee ANTES de que
el stream/buffer resuelva (por eso `len:0`), o se mide el `Content-Length` de
una respuesta chunked que no lo trae, o se comparó el objeto equivocado.
`generate.js` bufferea la respuesta desde un cambio reciente (ya no `pipe`),
así que el punto de medición pudo quedar desincronizado.

Impacto: ruido masivo en la sección Logs (y en breadcrumbs de GlitchTip — cuando
hay un error real, los breadcrumbs son casi todo "Small audio response"). Ya
está degradado para NO ser issue, pero igual entierra todo lo demás.

## Problema

El warning que debería marcar "Google devolvió body vacío (rate limit)" se
dispara también cuando la respuesta trae audio válido. `len:0` en todos los
casos sugiere que se mide en el momento equivocado.

## Pasos para reproducir

1. Con la app conectada y TTS activo, generar varias síntesis normales (que suenan bien).
2. Ver los logs: cada `sonido.tts.hablado` con `bytes > 0` viene acompañado de un `sonido.tts.respuesta_pequena` con `len:0`.

## Comportamiento esperado

`sonido.tts.respuesta_pequena` se emite **solo** cuando la respuesta de Google
realmente vino vacía o demasiado chica para ser audio (el caso de rate limit
que dispara el retry). Una síntesis exitosa (`bytes > 0`) NO emite el warning.

## Alcance / archivos involucrados

- `features/sonido/tts/fetch-audio.js` — dónde se decide "respuesta pequeña" y se emite el warning. Verificar que se mide el largo del buffer YA resuelto, no un stream sin consumir ni un header ausente.
- `features/sonido/tts/routes/generate.js` — el bufferado de la respuesta; confirmar que `fetch-audio.js` recibe el buffer final.
- `core/logger.js` — no debería tocarse, solo confirmar que el evento se emite desde `sonido/`, no acá.
- `test/` — si existe un test de `fetch-audio` (mock de fetch): agregar caso "respuesta con audio → NO warning" y "respuesta vacía → SÍ warning + retry".

## Criterios de aceptación

- [ ] Una síntesis con `bytes > 0` NO emite `sonido.tts.respuesta_pequena`.
- [ ] Una respuesta de Google con body vacío SÍ lo emite y dispara el retry/backoff existente (no regresar esa lógica).
- [ ] En un run normal de N síntesis exitosas, el conteo de `respuesta_pequena` es 0 (hoy es N).
- [ ] `npm test` pasa.

## Notas / restricciones

- NO desactivar el warning ni bajarlo a `debug` como parche — el objetivo es que sea correcto, no silenciarlo. Cuando Google rate-limitea de verdad, ese warning + el backoff son la defensa.
- NO tocar el retry/backoff de `fetch-audio.js` (funciona). Solo el punto de medición del largo.
- Independiente del resto del roadmap. Puede hacerse en cualquier momento de la Etapa 3.
- Si al investigar resulta que los clips SÍ son realmente vacíos (no un bug de medición), eso es un bug distinto y más grave (TTS mudo) → parar, documentar en el log de HANDOFF, escalar.
