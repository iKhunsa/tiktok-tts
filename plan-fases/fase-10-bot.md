# Fase 10 — /bot

## Objetivo
Separar la detección de comandos de chat (`!p`) de su ejecución (que vive en `/sonido` desde la Fase 9). Hoy ambas cosas están acopladas dentro de `handleMusicRequest` — esta fase formaliza la separación para poder agregar comandos futuros sin tocar `/sonido`.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/bot` — contrato: *"separa detección de comando (bot) de ejecución (sonido). Hoy acoplados en handleMusicRequest — en la reconstrucción se separan para poder agregar comandos futuros sin tocar /sonido."*
- `logging-errores-propuesta.md`, sección `/bot` — eventos `bot.comando.detectado` (debug), `bot.comando.no_reconocido` (debug, solo si `config.debugLog`).
- `mapa-funciones-actual.md`, sección Bot — hoy el único comando es `!p`, disparado desde los 3 handlers de chat (server.js:1563, 2618, 2860). Sin comandos de bot genéricos adicionales.

## Alcance — archivos a crear

```
bot/
  parse-command.js
  index.js
```

## Detalle

### parse-command.js
Detecta prefijos de comando en el texto de un mensaje ya permitido (llega vía `chat:mensaje-permitido`, después de que `/moderacion` y `/chat` ya decidieron que el mensaje es válido). Hoy solo reconoce `!p <query>` — migración de la detección que hoy vive al inicio de `handleMusicRequest`/los handlers de chat (server.js:1563 `conn.on('chat')`, server.js:2618 `client.on('message')`, server.js:2860 `liveChat.on('chat')`, donde se comprueba `text.startsWith('!p')` antes de llamar a la música).

Diseñado para crecer: la función retorna `{comando: 'play', args: '...'} | null`, agregar un comando nuevo en el futuro es agregar una rama acá, no tocar `/sonido`.

Eventos: `bot.comando.detectado` (debug) `{comando, platform, user}`; `bot.comando.no_reconocido` (debug, solo si `config.debugLog` está activo, para no llenar el log con cada mensaje normal de chat que no es comando).

### index.js
`register({bus})`: `bus.on('chat:mensaje-permitido', parseCommand)` → si matchea, `bus.emit('bot:comando', {cmd:'play', args, platform, user, userId})`. `/sonido` (Fase 9, `musica/handle-request.js`) se suscribe a `bot:comando` en vez de detectar `!p` por su cuenta.

## Criterios de aceptación
1. `!p <query>` sigue disparando música exactamente igual que antes (mismo resultado, sin regresión de latencia perceptible por el salto extra a través del bus).
2. Un mensaje normal de chat (sin `!p`) no genera ningún `bot:comando`, y con `debugLog` desactivado no genera ruido en el log.
3. Confirmar (leyendo el código de `/sonido` tras esta fase) que `musica/handle-request.js` ya no contiene ninguna detección de `!p` por su cuenta — solo reacciona a `bot:comando`.

## Riesgos
- Ninguno significativo — es una extracción de responsabilidad de bajo riesgo sobre lógica ya migrada en la Fase 9. El único cuidado es no romper el orden: `/bot` debe consumir `chat:mensaje-permitido` (ya filtrado por moderación), nunca `canal:mensaje-crudo` directo, para no reintroducir el acoplamiento que se está separando.
