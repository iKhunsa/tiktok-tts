# Bug 03 — `conn.on('error')` de TikTok: lee `err.message` (undefined) y no reconecta

## Contexto

GlitchTip issues 48/57/49: `canales.tiktok.error … undefined` en masa. Dos
problemas distintos en el mismo handler (`connect-tiktok-channel.js:101-120`):

1. **`err.message` es `undefined`.** `tiktok-live-connector` NO pasa un `Error`
   al evento `'error'`, pasa un objeto plano `{ info, exception }`
   (`node_modules/tiktok-live-connector/dist/lib/client.js:498-503`). El texto
   real está en `err.exception.message`, la categoría en `err.info`. El handler
   hace `\`... ${err.message}\`` → `"... TikTok foo: undefined"`, y propaga
   `undefined` al panel vía `bus.emit('canal:estado', { error: err.message })`.

2. **Tras la conexión, un `'error'` no agenda reconexión.** El handler solo
   tira teardown si `!entry.connectedOnce`; si ya conectó, solo loguea y emite
   `canal:estado`. Un error de socket que surja como `'error'` en vez de
   `'close'` deja el canal muerto sin recovery (hasta la tarea 02, que agrega
   watchdog — pero este handler debería reaccionar igual).

Nota: `831b8b8` ya agregó el `connectedOnce` y el teardown para el caso
"nunca conectó". Esta tarea completa lo que falta.

## Problema

- Los logs y el panel muestran `undefined` en vez del error real de TikTok.
- Un `'error'` post-conexión no dispara ninguna recuperación.

## Pasos para reproducir

1. Conectar TikTok a un canal que no está en vivo → `'error'` con `"The requested user isn't online :("` dentro de `err.exception.message`.
2. Ver el log: `canales.tiktok.error — Error de conexion TikTok X: undefined`.
3. (Post-conexión) provocar un `'error'` de socket estando conectado → no aparece ningún `reconectando` después.

## Comportamiento esperado

- El log y el `canal:estado` muestran `err.exception?.message ?? err.info ?? String(err)` — texto real, nunca `undefined`.
- `err.exception?.stack` en `data.stack` (no `err.stack`, que es undefined).
- Post-conexión (`entry.connectedOnce === true`): un `'error'` agenda una reconexión por el path existente (mismo que usa `'disconnected'`), respetando `MAX_RECONNECT_ATTEMPTS` y backoff. NO un loop: si ya hay una reconexión en curso para ese canal, no encolar otra.
- El caso `!connectedOnce` (nunca conectó) queda como está: teardown + `cleanupAfterLastTikTokChannel`, sin reintentar (es un canal que no existe o no está en vivo).

## Alcance / archivos involucrados

- `features/canales/tiktok/connect-tiktok-channel.js` — el handler `conn.on('error')` (~L101-120) y la lectura del error.
- `features/canales/tiktok/reconnect-tiktok.js` — si el path de reconexión post-error reutiliza `reconnectTiktok`, verificar que no choque con una reconexión ya en curso.
- Revisar si `reconnect-tiktok.js:34` (`catch (err)`) tiene el mismo bug de lectura — el subagente de auditoría dijo que ahí `err` sí es un Error/string real (viene del `reject` de `conn.connect()`), pero confirmarlo.
- `test/` — un test que emita un `'error'` con shape `{ info, exception }` y verifique que el log/estado NO dice `undefined` y que post-conexión agenda reconexión.

## Criterios de aceptación

- [ ] `conn.on('error')` con `{ info: 'WebSocket Error', exception: new Error('boom') }` → log y `canal:estado` contienen `"boom"` (o `"WebSocket Error"`), nunca `"undefined"`.
- [ ] `data.stack` en el log trae el stack real cuando existe.
- [ ] `'error'` con `entry.connectedOnce === true` → agenda una reconexión (aparece `canales.tiktok.reconectando`).
- [ ] `'error'` con `entry.connectedOnce === false` → teardown, sin reintento (comportamiento actual, no regresar).
- [ ] No se agendan reconexiones duplicadas si ya hay una en curso para el canal.
- [ ] `npm test` pasa.

## Notas / restricciones

- **Hacer ANTES que la tarea 02.** Ambas tocan `connect-tiktok-channel.js`; esta es chica y aislada, 02 se rebasa encima.
- Habilita la tarea 07 (filtrar ruido de GlitchTip): con el texto real disponible, se puede distinguir `"The requested user isn't online"` (esperado, no promover) de un error de socket real (sí promover).
- No cambiar el comportamiento del caso `!connectedOnce` — ya lo arregló `831b8b8`.
- La reconexión post-error y el watchdog de la tarea 02 pueden solaparse. Está bien mientras haya un solo guard "reconexión en curso" que ambos respeten.
