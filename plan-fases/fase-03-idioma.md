# Fase 3 — /idioma

## Objetivo
Dominio puro (sin estado mutable compartido) que filtra mensajes por idioma/script de voz. Se construye temprano porque es fácil de aislar y testear, y porque `/moderacion` (Fase 5) y `/sonido` (Fase 9) lo consumen.

## Referencia obligatoria
- `arquitectura-propuesta.md`, sección `/idioma` — contrato: *"único dueño de diccionarios/regex de idioma. Moderación y Sonido lo consumen vía función pura importada del contrato publicado (no vía bus, porque es cómputo síncrono sin estado compartido mutable)."*
- `logging-errores-propuesta.md`, sección `/idioma` — eventos `idioma.script.evaluado`/`idioma.dict.evaluado` (debug, sin loguear el texto del mensaje por privacidad), `idioma.dict.cargado`/`idioma.dict.carga_fallida`.
- `mapa-funciones-actual.md`, sección Idioma — funciones a migrar: `GOOGLE_TTS_LANGS`/`DICT_FILTER_LANGS`/`VOICE_TO_DICT_LANG` (server.js:584-593), `VOICE_SCRIPT_REGEX` (server.js:1248), `messageMatchesVoiceScript` (server.js:1258), `messageMatchesDictLang` (server.js:1295), `getLangDicts` (server.js:1269, carga `public/lang-words/*.json`).

## Alcance — archivos a crear

```
idioma/
  google-tts-langs.js
  dict-filter-langs.js
  voice-to-dict-lang.js
  voice-script-regex.js
  message-matches-voice-script.js
  message-matches-dict-lang.js
  lang-dicts.js
  index.js
```

## Detalle por archivo

### google-tts-langs.js / dict-filter-langs.js / voice-to-dict-lang.js
Constantes puras, migración directa de server.js:584-593. Sin lógica adicional.

### voice-script-regex.js
Migración directa de `VOICE_SCRIPT_REGEX` (server.js:1248) — mapa de `voiceId → regex de script Unicode`.

### message-matches-voice-script.js — messageMatchesVoiceScript(text, voiceId)
Misma lógica que server.js:1258. Log: `idioma.script.evaluado` (debug) con `{voiceId, coincide}` — **nunca el texto** (privacidad, según regla del dominio).

### message-matches-dict-lang.js — messageMatchesDictLang(text)
Misma lógica que server.js:1295. Log: `idioma.dict.evaluado` (debug) con `{voiceId, coincide}`.

### lang-dicts.js — getLangDicts()
Carga lazy de `public/lang-words/{lang}.json`, misma ruta relativa que server.js:1269 (usa `core/paths.js` para resolver la base correcta en dev vs packaged). Eventos:
- `idioma.dict.cargado` (info) `{lang, palabras}`
- `idioma.dict.carga_fallida` (warn) `{lang, path, error}` — fixea server.js:1284, que ya tenía log pero se homologa al esquema nuevo con `path` explícito.

### index.js
`register({bus})`: no monta rutas HTTP propias (este dominio no tenía endpoints propios en el backend actual, solo era usado internamente por moderación y por `/api/voices` de sonido). Expone el contrato:
```js
module.exports.contrato = {
  filtrar(text, voiceId) {
    // combina messageMatchesVoiceScript + messageMatchesDictLang
    // según la config activa (filtro por script vs por diccionario)
  }
};
```
Este objeto se inyecta en `core/contracts/idioma-filtrar.js` (definido como interfaz vacía en la Fase 1) para que `/moderacion` y `/sonido` lo consuman sin importar `idioma/` directo — mismo patrón de inyección que `moderacion-policy`.

## Criterios de aceptación
1. Para un set de mensajes de prueba en español/inglés/portugués/francés/alemán/italiano/japonés/chino/ruso/coreano (los 13 idiomas soportados hoy), `idioma.filtrar(text, voiceId)` da el mismo resultado booleano que `messageMatchesVoiceScript`/`messageMatchesDictLang` del backend viejo para los mismos inputs.
2. Cargar `public/lang-words/es.json` inexistente o corrupto a propósito → `idioma.dict.carga_fallida` se emite, el dominio sigue funcionando con los demás idiomas cargados (no tumba el proceso ni bloquea otros idiomas).
3. Ningún log generado por este dominio contiene el texto de un mensaje de chat real, solo `{voiceId, coincide}`.

## Riesgos
- Ninguno significativo — es el dominio más aislado de todo el rebuild (sin estado, sin I/O más allá de la carga inicial de diccionarios). Buen candidato para escribir tests unitarios reales antes de las fases con más dependencias cruzadas.
