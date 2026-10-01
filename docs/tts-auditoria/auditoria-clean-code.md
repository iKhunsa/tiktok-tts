# Auditoría Clean Code — cadena TTS

Alcance revisado: TikTok crudo → `chat` → moderación/idioma → broadcast WS → renderer → cola TTS → `/api/tts` → Google. Revisión solo lectura, 2026-09-28.

## Causa raíz de palabras repetidas

### H1 — Confirmada: el sanitizador busca un byte de control, no el carácter repetido

- **Probabilidad:** confirmada.
- **Ubicación:** `features/chat/sanitize-for-tts.js:10`.
- **Evidencia:** el patrón almacenado es `/(.)\x01{4,}/g`: la inspección del archivo produjo `2f282e29017b342c7d2f672c2027243124312431` (`01` después de `(.)`), no `5c31` (`\1`). La ejecución produjo:

  ```text
  sanitize: holaaaaaa
  ```

  Por tanto, `sanitizeForTTS('holaaaaaa')` no reduce las seis `a`. El mismo sanitizador alimenta `ttsComment` de TikTok en `features/chat/emit-chat-message.js:124` y de las demás plataformas en las líneas 175, 214 y 253.
- **Fix mínimo propuesto (no aplicado):** sustituir el byte literal por el backreference: `.replace(/(.)\1{4,}/g, '$1$1$1')`.

### H2 — Defensa incompleta ante una entrega duplicada ya dentro del renderer

- **Probabilidad:** baja; es una vía posible, no evidencia de que esté ocurriendo.
- **Ubicación:** `interfaz/src/nucleo/ws/cliente-ws.js:104-106`, `:41-45`; `interfaz/src/nucleo/tts/cola-tts.js:250-265`.
- **Evidencia:** cada payload `chat` crea un `msg-${contador}` local y llama a `handleChatData`; `speak()` encola sin deduplicar por `msgId`. El backend sí deduplica el replay de TikTok antes del broadcast con `raw.msgId` durante diez minutos (`features/chat/emit-chat-message.js:40-56,75-97,289-299`), y `test/chat-dedup.test.js:36-55` cubre el caso. Pero el payload publicado no transporta ese id estable (`:350-369`), por lo que el cliente no puede descartar una segunda entrega idéntica si se produjera después del gate.
- **Fix mínimo propuesto (no aplicado):** incluir `sourceMsgId: raw.msgId` (o la clave de dedup) en `enrichedPayload` y mantener en `cliente-ws.js` un `Set` acotado de ids ya procesados antes de generar el id visual. Conservar el gate backend como barrera principal.

### Hipótesis revisadas y descartadas como causa actual

| Hipótesis | Evidencia | Conclusión |
|---|---|---|
| Dos conexiones TikTok activas | `connect-tiktok-channel.js:127-129` desmonta la anterior; `:179-201` ignora eventos cuyo `conn` ya no es el actual; `:592-600` desmonta el ciclo anterior. El test de supervisor cubre el reemplazo de conexión vieja. | No es la causa observada. |
| Dedup de moderación insuficiente | `is-duplicate-recent.js:3-18` conserva por usuario el texto normalizado durante 45 s; `is-spam.js:40-44` lo aplica desde cuatro caracteres. Prueba manual: `false true` para dos llamadas iguales. | Es segunda barrera y bloquea repetición de mensajes, no explica letras repetidas dentro de una palabra. |
| Reorden de `speechQueue` | `cola-tts.js:262-263` solo ordena por `timestamp`; no duplica elementos. El lock `queuePumping` en `:268-281` serializa pumps. | No hay mecanismo de duplicación. |
| Retry de TTS o `audio.play()` | `fetch-audio.js:202-233` reintenta la descarga antes de devolver un único buffer. `cola-tts.js:205-231` usa `settled` para que `ended`, `error` y fallo de `play()` completen una sola vez. | No reproduce el mismo buffer dos veces. |
| Texto >200 y trozos solapados | El renderer limita a `CHAT_TTS_MAX_LEN = 200` (`config-runtime.js:22`, `chat-ui.js:293`); backend vuelve a limitar a 200 (`fetch-audio.js:31,169`). No existe código de chunking. | No hay trozos ni solapamiento; sí existe truncado silencioso si la configuración remota supera 200. |
| Colisión de cache | `fetch-audio.js:45-47` hashea `lang|slow|texto` con SHA-1; entradas distintas requieren una colisión criptográfica. | Riesgo teórico, no causa práctica de repetición. |

## Hallazgos Clean Code

Las copias deliberadas `features/chat/normalize-aggressive.js` y `features/moderacion/filters/normalize-aggressive.js` no se marcan como G5: `CLAUDE.md` las declara explícitamente una excepción. Tampoco se marca el hub `cliente-ws.js` por sus imports: `CLAUDE.md` lo define como traductor/hub legítimo. En ambos conflictos prevalece la convención del proyecto.

| ID | archivo:línea | regla/smell | por qué importa | corrección propuesta | severidad |
|---|---|---|---|---|---|
| CC-01 | `features/chat/sanitize-for-tts.js:10` | G2 comportamiento obvio no implementado; G3 límite; T1 tests insuficientes | El comentario promete colapsar letras repetidas, pero el byte `0x01` hace que no ocurra y el TTS recibe texto alterado. | Cambiar a `\1`; añadir un test puro que afirme `sanitizeForTTS('holaaaaaa') === 'holaaa'`. | alta |
| CC-02 | `features/moderacion/filters/is-spam.js:26` | F1 demasiados argumentos | Siete argumentos mezclan identidad, estado, configuración y regla; es fácil intercambiarlos y dificulta testear la política. | Pasar un único objeto de contexto con nombres (`{ logger, text, userKey, ident, blockedMatchersState, idiomaOpts, dupState }`), sin nueva abstracción. | media |
| CC-03 | `features/chat/emit-chat-message.js:264-386` | G30 una función hace varias cosas; G34 niveles de abstracción | Extrae cuatro plataformas, deduplica, registra, consulta moderación/configuración, decide TTS y publica WS; un cambio de ruta puede romper otra. | Reusar los `extract*Message` ya presentes y extraer solo el bloque posterior en pasos locales nombrados: dedup, evaluar, publicar. No cambiar contratos ni dominios. | media |
| CC-04 | `interfaz/src/nucleo/ws/cliente-ws.js:104-106`; `interfaz/src/nucleo/tts/cola-tts.js:250-265` | G22 dependencia lógica implícita; T1 | El backend protege replay, pero cliente y cola asumen que cada entrega WS es nueva; no hay prueba de esa frontera. | Propagar el identificador de fuente y añadir una prueba de cliente/cola que intente entregar el mismo `sourceMsgId` dos veces. | media |
| CC-05 | `features/sonido/tts/fetch-audio.js:169`; `interfaz/src/nucleo/estado/config-runtime.js:68` | G3 condición de límite | El cliente acepta cualquier `TTS_MAX_CHARS` entero positivo, pero el backend corta a 200; la UI puede prometer una longitud que nunca se sintetiza completa. | Validar/limitar la config remota a 200 o exponer el límite efectivo; añadir una prueba de configuración de límite. | baja |

## Orden de corrección recomendado

1. Corregir H1 y añadir su regresión: elimina la causa confirmada con un cambio de una línea.
2. Mantener y ejecutar los tests de dedup existentes; si hay telemetría de payload repetido, implementar la barrera opcional H2 en el renderer.
3. Alinear el máximo configurable con Google; después, simplificar los argumentos de `isSpam` y el orquestador solo si vuelven a tocarse.

## Verificación ejecutada

```text
node -e … sanitizeForTTS('holaaaaaa')
sanitize: holaaaaaa

npm test …
196 passed, 0 failed
```


## Revisión del coordinador (Claude) — correcciones al reporte de Codex

- **H1 sobrestimada.** El byte `0x01` existe (`features/chat/sanitize-for-tts.js:10`), pero `/api/tts` re-sanitiza con la copia `features/sonido/sanitize-for-tts.js:10`, que sí tiene `(.)\1{4,}`. Resultado: el **audio** sale colapsado; lo que se rompe es el texto **mostrado** en el chat (`sanitizeForChat`). Sigue siendo bug (CC-01), pero no explica que la voz repita palabras. Además es una divergencia entre las dos copias "deliberadas": la excepción de CLAUDE.md asume que son idénticas y ya no lo son.
- **H3 (nueva, alta) — no existe colapso de palabras repetidas.** `sanitizeForTTS('hola hola hola hola')` → `"hola hola hola hola"` (verificado con node). Ambos sanitizadores solo colapsan *caracteres*; el dedup (`isDuplicateMessage`, `isDuplicateRecent`) compara *mensajes completos*. Un mensaje con la misma palabra N veces se lee N veces. Fix propuesto (sin aplicar): en `sanitizeForTTS` de ambas copias añadir `.replace(/(\b[\p{L}\p{N}]+\b)(?:\s+\1\b){2,}/giu, '$1 $1')` (máx. 2 repeticiones seguidas) + test.
- **H4 (nueva, media) — `playAudioBlob` no pausa el audio al vencer el timeout de 5 s** (`interfaz/src/nucleo/tts/cola-tts.js:222-231`). `finish(onError)` suelta `activeAudio` y la cola avanza, pero si `audio.play()` resuelve tarde (dispositivo de audio despertando, Bluetooth) ese audio suena igual y ya no hay referencia para cortarlo → dos voces superpuestas, percibido como "eco/repetición". Fix: en el `.catch` de timeout, `audio.pause(); audio.src = '';` antes de `finish(onError)`.
- **Orden de corrección revisado:** H3 → H4 → CC-01 (unificar las dos copias de sanitize o al menos igualar el regex) → CC-04 → CC-05 → CC-02/CC-03 (solo si se vuelven a tocar esos archivos).
