# Fase 9 — /sonido

## Objetivo
Todo lo que produce audio: TTS de Google Translate, bot musical (`!p`, motor yt-dlp), soundpad. Consume `chat:mensaje-permitido` de `/chat` (Fase 7), decide qué se lee, nunca decide moderación (ya viene resuelta).

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/sonido` — tres subcarpetas (`tts/`, `musica/`, `soundpad/`) y el contrato: *"Sonido decide QUÉ se lee, pero nunca decide moderación (ya viene resuelta en chat:mensaje-permitido)."*
- `logging-errores-propuesta.md`, sección `/sonido` — eventos `sonido.tts.*` y `sonido.musica.*`. Prestar especial atención a `sonido.musica.cola_llena`, el hallazgo MÁS citado por el usuario como "dato genérico" (hoy server.js:844 no incluye ni usuario, ni plataforma, ni tamaño de cola).
- `mapa-funciones-actual.md`, sección Sonido — TTS, bot musical completo (incluye `music-engine.js` entero, 232 líneas, factory `createMusicEngine`), soundpad.

## Alcance — archivos a crear

```
sonido/
  tts/
    is-rate-limited.js
    langs.js
    routes/
      generate.js
      voices.js
  musica/
    handle-request.js
    resolve-youtube-id.js
    resolve-full-track.js
    extract-youtube-video-id.js
    format-duration.js
    broadcast-state.js
    advance-queue.js
    resolve-and-save-playlist.js
    set-playlist-enabled.js
    engine/
      create.js
      spawn-child.js
      run-ytdlp.js
      common-args.js
      detect-js-runtime.js
      download-binary.js
      ensure-ready.js
      get-status.js
      check-for-updates.js
      to-track.js
      search.js
      get-info.js
      create-stream.js
      shutdown.js
    routes/
      stream.js
      engine-status.js
      queue.js
      skip.js
      next.js
      config-get.js
      config-patch.js
      ban.js
      unban.js
      playlist-get.js
      playlist-put.js
      playlist-toggle.js
      playlist-shuffle.js
  soundpad/
    load-sounds.js
    save-sounds.js
    sync-to-mobile-state.js
    routes/
      list.js
      upload.js
      patch.js
      delete.js
    shortcuts.js
  index.js
```

## Detalle por subcarpeta

### tts/
- `is-rate-limited.js` — migración de `isTTSRateLimited` (server.js:1446).
- `langs.js` — re-exporta `GOOGLE_TTS_LANGS`/`DICT_FILTER_LANGS`/`VOICE_TO_DICT_LANG` desde `/idioma` (Fase 3), sin duplicar la constante.
- `routes/generate.js` — migración de `POST /api/tts` (server.js:1805), gTTS + proxy stream de Google Translate TTS. Eventos completos: `sonido.tts.solicitado` (`{voice, textLen}`, nunca el texto), `rate_limitado`, `hablado`, `error_google_http`/`error_google_timeout`/`error_google_red` (los 3 con stack).
- `routes/voices.js` — migración de `GET /api/voices` (server.js:1881).

### musica/
- `handle-request.js` — migración de `handleMusicRequest` (server.js:811), consume `bot:comando` de `/bot` (Fase 10) en vez de detectar `!p` directo (esa detección se mueve a `/bot`). Eventos completos migrados de logging-errores-propuesta.md: `solicitud_recibida`, `deshabilitada` (fixea server.js:813, hoy sin datos), `comando_duplicado`, `usuario_baneado` (fixea server.js:839, hoy sin platform/query), `cooldown_activo`, **`cola_llena`** (fixea server.js:844 — el caso más citado, ahora con `{user, platform, colaActual, colaMaxima}` obligatorio), `motor_no_disponible`, `track_resuelto`, `track_no_encontrado`, `stream_error`.
- `resolve-youtube-id.js`/`resolve-full-track.js`/`extract-youtube-video-id.js` — migración de server.js:754/774/732.
- `format-duration.js` — **una sola fuente** (hoy está duplicada entre server.js:790 y music-engine.js:16 — en el rebuild se unifica acá y `engine/to-track.js` la importa de este archivo, eliminando la duplicación).
- `broadcast-state.js`/`advance-queue.js`/`resolve-and-save-playlist.js`/`set-playlist-enabled.js` — migración de server.js:797/885/924/3999.
- `engine/*.js` — migración 1:1 de `music-engine.js` completo (factory `createMusicEngine` → 13 archivos, uno por método: `spawn-child`, `run-ytdlp`, `common-args`, `detect-js-runtime`, `download-binary`, `ensure-ready`, `get-status`, `check-for-updates`, `to-track`, `search`, `get-info`, `create-stream`, `shutdown`). Mismos catches silenciosos a revisar según regla dura #3 de logging-errores-propuesta.md (ej. `download-binary.js` hoy tiene 2 `catch(_){}` al borrar archivo temporal/binario corrupto — decidir si se loguean como `debug` de limpieza o si de verdad son best-effort puro).
- `routes/*.js` — migración 1:1 de los 13 endpoints `/api/music/*` (server.js:3872-4025).

### soundpad/
- `load-sounds.js`/`save-sounds.js` — migración de server.js:189/197.
- `sync-to-mobile-state.js` — migración de server.js:3750, publica a `/movil` vía bus en vez de tocar `mobileState` directo.
- `routes/*.js` — migración de los 4 endpoints (list/upload/patch/delete, server.js:3755-3795). `upload.js` fixea server.js:3800 (fallo borrando archivo, hoy silencioso) → `sonido.soundpad.borrado_archivo_fallido` (warn).
- `shortcuts.js` — migración de `ipcMain.handle('register-soundpad-shortcut'/'unregister-soundpad-shortcut')` (main.js:592/633) — este archivo es el primer punto donde `/sonido` necesita comunicarse con `/electron-shell` (todavía no existe hasta la Fase 12). Definir en esta fase el contrato de IPC que se usará (nombre de canal, payload) aunque la implementación completa del lado Electron llegue después.

### index.js
`register({app, bus})`: `bus.on('chat:mensaje-permitido', ...)` → decide hablar o no según config de voz/idioma (usa el contrato de `/idioma`, Fase 3), expone `bus.emit('sonido:hablar', text)` que el renderer consume vía WS/IPC (mismo mecanismo que hoy, cola TTS ordenada por timestamp en el cliente — sin cambios ahí, es front).

## Criterios de aceptación
1. TTS genera audio idéntico al backend viejo para el mismo texto/voz (mismo endpoint de Google Translate, mismos parámetros).
2. `!p <query>` resuelve y reproduce música — probar con query de texto libre y con URL de YouTube directa.
3. Cola de música llena (forzar con múltiples requests simultáneas) — confirmar que `sonido.musica.cola_llena` sale con los 4 campos obligatorios, no vacío como hoy.
4. Soundpad: subir, reproducir (vía atajo), editar nombre/color, borrar un sonido — funciona igual, incluyendo el límite de 24 sonidos.
5. Playlist de fondo: cargar una playlist, activar/desactivar, shuffle — comportamiento idéntico.
6. Confirmar que `format-duration.js` solo existe en un lugar (grep de la función en todo `/sonido` debe dar un solo archivo fuente, los demás solo lo importan).

## Riesgos
- El motor de música depende de un binario externo (yt-dlp) que se descarga en runtime — las pruebas de esta fase requieren red y pueden ser lentas/flaky la primera vez (descarga del binario). Considerar cachear el binario ya descargado por el backend viejo en desarrollo para no re-descargarlo en cada prueba.
- El contrato de IPC entre `/sonido/soundpad/shortcuts.js` y `/electron-shell` queda definido pero no probado end-to-end hasta la Fase 12 — riesgo de tener que ajustar la forma del payload cuando esa fase se implemente.
