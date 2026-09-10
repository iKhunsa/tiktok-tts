# Bug 04 — El aviso promocional se dispara "cada 15 min" tras reconexiones

## Contexto

Reporte: "después de 1 h se reinicia el bot… y el aviso salía cada 15 minutos".
Evidencia (log `soy.italiano`): 24 promos con huecos de `45, 23, 45, 60, 90,
30, 45, 60…` min (nada de intervalo fijo), y **13 de 24 dispararon 1.2–2.7 min
después de un `canales.*` connect/reconnect**. En `bubulubuvt`, cuando las
reconexiones paran, la cadencia se asienta en 90 min limpios.

Confirmado: **NO es un leak de `setInterval`.** `features/promo/session-scheduler.js`
es idéntico en `v1.8.7` y HEAD — cadena de `setTimeout` con `SCHEDULE_MINUTES =
[15, 45, 60]` (deltas entre avisos) y `REPEAT_MINUTES = 90` después. `running`
guard + `stop()` limpia el timer + el callback chequea `!running` antes de
re-armar. Sin doble-timer.

La causa: `features/promo/index.js` escucha `canal:estado` y llama
`scheduler.startIfNeeded()` cuando hay ≥1 canal y `scheduler.stop()` cuando hay
0. Una reconexión de TikTok que agota 5 intentos → `cleanupAfterLastTikTokChannel`
→ `broadcastChannels` con total 0 → `stop()` (resetea `stepIndex = 0`). El
usuario reconecta → `startIfNeeded()` → **arranca de nuevo el schedule desde
`[15…]`** → aviso temprano. Cada ciclo caída-total/reconexión = un aviso a los
~15 min (o menos, ver abajo).

> El "1–2 min" del log es más corto que los 15 min del primer paso. Investigar
> si en la versión desplegada hay además un disparo inmediato de `onMilestone`
> al arrancar, o si `broadcastChannels` emite `canal:estado` varias veces
> seguidas re-armando. El subagente debe confirmar el mecanismo exacto sobre el
> código real de la rama, no asumir.

## Problema

El scheduler de avisos trata cada transición 0→N de canales como "sesión de
vivo nueva" y reinicia la cuenta `[15, 45, 60]`. Con TikTok cayéndose y
reconectando seguido, el usuario recibe un aviso cada vez, muy por encima del
intervalo configurado.

## Pasos para reproducir

1. Conectar 1 canal. Anotar hora.
2. Forzar caída total (desconectar el único canal) y reconectar antes de 15 min.
3. Observar `promo.autopromocion.disparada` poco después de la reconexión, en vez de a los 15 min de la sesión original.
4. Repetir la caída/reconexión → un aviso por ciclo.

## Comportamiento esperado

Una reconexión (o una caída total seguida de reconexión dentro de una ventana
corta, p.ej. **< 5 min**) NO reinicia la cuenta del scheduler: se considera la
misma sesión de vivo. El `stepIndex` y el timer en curso se preservan.

Solo una sesión genuinamente nueva (el streamer estuvo desconectado un rato
largo, o cerró y reabrió la app) reinicia `[15, 45, 60]`.

Opción de implementación (elegir la más simple que funcione sobre el código real):
- En `promo/index.js`, al bajar a 0 canales no llamar `stop()` inmediato: arrancar un `setTimeout` de gracia (~5 min). Si vuelve a haber canales antes → cancelar, no se tocó el scheduler. Si se cumple → `stop()` de verdad.
- O que `session-scheduler` distinga `pause()` (mantiene `stepIndex` y el tiempo transcurrido) de `stop()` (resetea), y `promo/index.js` use `pause()` en la bajada y `stop()` solo tras la ventana de gracia.

## Alcance / archivos involucrados

- `features/promo/index.js` — el listener de `canal:estado` y la lógica start/stop.
- `features/promo/session-scheduler.js` — si hace falta un `pause()`/`resume()` que preserve estado.
- `features/canales/cleanup-after-last-channel.js` / `broadcast-channels.js` — solo para entender qué eventos emite en una reconexión (no tocar salvo que sea la causa exacta).
- `test/` — test: caída total + reconexión rápida NO reinicia el schedule; caída larga sí.

## Criterios de aceptación

- [ ] El subagente documentó en el log de HANDOFF el mecanismo exacto del "1–2 min" sobre el código de la rama (no la hipótesis).
- [ ] Una reconexión / caída-total-y-vuelta en < 5 min NO produce un `promo.autopromocion.disparada` fuera de la cadencia normal.
- [ ] Una sesión nueva de verdad (sin canales > 5 min, luego reconecta) sí reinicia `[15, 45, 60]`.
- [ ] La cadencia en estado estable (sin reconexiones) sigue siendo `15 → 45 → 60 → 90 → 90…` — no se rompió.
- [ ] `npm test` pasa, con test nuevo.

## Notas / restricciones

- **No** rediseñar el scheduler. El timer base funciona (probado). El fix es solo evitar el reinicio espurio.
- La ventana de gracia de 5 min es una heurística → comentario `ponytail:` con el número y "subir si sesiones cortas legítimas se pierden avisos".
- Depende conceptualmente de la tarea 02: con el watchdog, TikTok se cae menos → menos reinicios. Pero este fix hace falta igual porque las caídas seguirán existiendo.
- El entitlement `sin-promos` (suscripciones) es ortogonal — no tocarlo acá.
