# Moderación de espectadores

Registro persistente de todo espectador que interactúa, más los seguidores, con moderación **local** por usuario (no se toca la plataforma). Único dueño de `moderation.json` (en `DATA_BASE`, o sea `app.getPath('userData')`).

## Store

El store está migrado: un archivo por función (`features/moderacion/store/*.js`) sobre un `state` compartido en vez de un closure — ver `features/moderacion/store/create-store.js`.

- **Clave por usuario:** `` `${platform}:${id}` ``; sin id estable cae a `` `${platform}:name:${nick}` `` y se marca `idk:'name'` (castigo frágil: se pierde si el usuario cambia de nombre). Las dos formas nunca se fusionan.
- **Dos ejes ortogonales:** `mute` (el mensaje se ve, el TTS no lo lee) y `ban` (el mensaje ni se emite). Valores `0` / `-1` (indefinido) / epoch ms.
- **Expiración perezosa:** comparación contra `Date.now()`, nunca un `setTimeout` por usuario. Sobrevive a la app cerrada y al equipo suspendido.
- **Escritura con debounce:** 15 s (techo de 60 s) para la ingesta de alta frecuencia; las acciones de moderación hacen flush inmediato. `writeFileSync` a `.tmp` + `rename`.
- **JSON corrupto:** se aparta como `.corrupt-<ts>` y se arranca vacío; **nunca lanza**, porque el require corre al arrancar la app.
- **Cap de 5.000 espectadores** con purga LRU a 4.000 que jamás descarta seguidores, whitelisted ni usuarios con castigo vivo.

## Flujo de messages

`features/chat/emit-chat-message.js` es el **único** punto por el que salen los mensajes de las 3 plataformas:
1. Llega crudo de `features/canales/` vía el bus (`canal:mensaje-crudo`)
2. Llama sincrónicamente a `moderacionPolicy.evaluate()` (contrato inyectado por `features/moderacion/`, fail-open si lanza)
3. Publica `chat:mensaje-permitido`/`chat:mensaje-bloqueado`

Los handlers de plataforma y el cliente no repiten ninguna de esas reglas.

**UI:** vista "Moderación" en el menú izquierdo, con pestañas Seguidores / No seguidores sobre la misma tabla.

## Rust Chat Guard

Segunda capa de contenido, encendida por defecto en shadow (`rustGuardEnabled: true`, `rustGuardMode: 'shadow'|'enforce'`, por cuenta). Corre dentro de `moderacionPolicy.review` DESPUÉS del guard JS y solo endurece (BLOCK→drop, REVIEW→mute).

**Fail-open:** cualquier fallo/paquete ausente conserva el veredicto JS y loguea `moderacion.rust.*` (nunca silencioso). Paquete `@tiklivetts/rust-chat-guard` opcional, cargado solo en `load-engine.js`. El cableado en `index.js` lleva `// rust-guard`.

**UI:** Ajustes > «Moderación del chat» (`interfaz/src/vistas/principal/moderacion-contenido/`):
- Maestro: `rustGuardEnabled`
- Nivel/idiomas/personalizado: `chatGuardLevel|Langs|Custom` (constantes en `core/chat-guard-options.js`)
- Modo: `rustGuardMode`
- Palabras permitidas: `chat-guard-allowed-words.json` por cuenta (solo palabras sueltas)
- Estado del motor: `GET /api/chat-guard/status` → `off|unavailable|error|ok`

**Idiomas según la voz:** con `chatGuardLangsAuto` (default `true`) los idiomas del motor = `localesForVoice(ttsVoiceLang)` (`core/chat-guard-voice-languages.js`, siempre + inglés); con `false` manda `chatGuardLangs`. 

`create-rust-guard.js` arranca el motor SIN `languages` para descubrir los soportados (`getStatus().languages`) y recorta lo pedido a eso (log `moderacion.rust.idioma_no_soportado`, nunca excepción). Un cambio de voz llega por `config:actualizado` y se aplica en caliente; la UI se refresca con el WS `config-updated`. 

Cuentas antiguas: `normalizeStoredConfig` pone auto=false solo si eligieron idiomas distintos de la lista por defecto vieja (`LEGACY_DEFAULT_LANGS`).

## Popup de moderación

Badge en la vista Chat. `emit-chat-message.js` publica por WS:
```
moderation-blocked {
  platform, 
  accion: drop|mute|shadow, 
  origen, 
  motivo, 
  nick, 
  text, 
  timestamp
}
```

`features/chat/describe-moderation.js` deduce origen/motivo de `verdict.reasons`; `shadow` lo anota `rust-guard/review-with-rust.js`. 

El cliente lo guarda en `nucleo/estado/moderacion-sesion.js`: buffer **solo en memoria**, máx. 200, jamás a disco ni telemetría (política de privacidad). 

El log `moderacion.filtro.mensaje_bloqueado` lleva solo plataforma/acción/origen/motivo, sin texto ni nick.

**UI:** `vistas/principal/moderacion-popup/`. «descartados» del badge = cola TTS llena, no moderación.
