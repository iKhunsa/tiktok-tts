# Bug 10 — `Google TTS failed: "text should be a string"`

## Contexto

En los logs (schema viejo y nuevo, 2-8× por archivo):
`Google TTS failed {"error":"text should be a string"}`. Viene de
`google-tts-api`, que valida que su input sea string y tira si no lo es. Algo
no-string (probablemente `undefined`, `null`, un número, o un objeto) llega a la
función de síntesis.

Baja frecuencia, no correlaciona con el ciclo de replay ni con nada más. Bug
suelto de robustez de input.

## Problema

Un valor no-string llega a la generación de TTS y `google-tts-api` lanza. El
mensaje se pierde (no se sintetiza) y se registra un error.

## Pasos para reproducir

No hay repro determinístico conocido. Candidatos a investigar:
- Un mensaje de chat cuyo texto quedó `undefined` tras la normalización / sanitización (`sanitize-for-tts.js`, `normalize-aggressive.js`).
- Un aviso de promo / announce con una variable de interpolación sin resolver.
- Un TTS disparado desde el móvil o MCP con payload mal formado.

El subagente debe: grepear todos los call sites de la función de síntesis
(`features/sonido/tts/...`), ver qué le pasan, y añadir un guard + un log que
capture el valor ofensivo si vuelve a pasar.

## Comportamiento esperado

- Antes de llamar a `google-tts-api`, la función de síntesis hace
  `String(text ?? '').trim()` (o rechaza temprano si queda vacío).
- Si el input llega no-string, se loguea a `warn` con el tipo y una pista del
  origen (`typeof`, y de dónde vino si se sabe), y NO se llama a Google con
  basura.
- Un input vacío tras el coerce → no se sintetiza, log `debug`, sin error.

## Alcance / archivos involucrados

- `features/sonido/tts/routes/generate.js` — el endpoint `/api/tts`; validar `req.body.text` / el parámetro antes de pasarlo.
- `features/sonido/tts/fetch-audio.js` — el guard final justo antes de `google-tts-api`, como red de seguridad (un solo lugar por el que pasan todas las síntesis).
- `features/sonido/tts/*` — los call sites (announce, promo, soundpad si aplica).
- `test/` — test: `synth(undefined)` / `synth(123)` no llama a Google y no tira; `synth('  ')` no sintetiza.

## Criterios de aceptación

- [ ] Pasar `undefined` / `null` / un número a la síntesis NO produce `"text should be a string"` — se coerce o se rechaza limpio.
- [ ] El caso no-string queda logueado a `warn` con `typeof` + pista de origen, una sola vez por ocurrencia (no en loop).
- [ ] Los call sites que puedan mandar no-string se identificaron y se anotaron en el log de HANDOFF (aunque el guard central ya los cubra).
- [ ] `npm test` pasa.

## Notas / restricciones

- El guard central en `fetch-audio.js` es el fix lazy que cubre todos los call sites de una (regla de modularidad: un guard en el punto común, no en cada caller). Agregar guards en los callers solo si hay uno que claramente manda basura y conviene cortarlo antes.
- NO silenciar el error sin entender de dónde viene — el objetivo es que deje de pasar, con trazabilidad si vuelve.
- Independiente del resto del roadmap.
