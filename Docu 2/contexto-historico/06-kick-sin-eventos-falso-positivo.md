# Bug 06 — `canales.kick.sin_eventos` cada 5 min en canal tranquilo (falso positivo)

## Contexto

GlitchTip issue 55. `features/canales/kick/stale-watchdog.js`:
`WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000`. Se re-arma en cada `CHAT_MESSAGE_EVENT`.
En un canal de Kick con poco chat (legítimamente 0 mensajes en 5 min), el
watchdog dispara `canales.kick.sin_eventos` → `scheduleReconnect(..., 'stale')`
cada 5 min, indefinidamente. Evidencia (log `kiintsu99`, 2026-09-10 08:xx):
`sin_eventos` a las 08:32, 08:37, 08:42, 08:47, 08:52… en reloj exacto, cada uno
seguido de `reconectando intento 1 (motivo: stale)` y `conectado` ~2 s después.

Genera: (a) churn de reconexión infinito en Kick, (b) ruido en GlitchTip (el
evento se promueve a issue), (c) potencial replay en cada reconexión.

Nota: Kick sí tiene un ping propio cada 100 s (`PING_INTERVAL_MS`) porque Pusher
corta a los 120 s. Ese ping mantiene el socket vivo aunque no haya chat — o sea
que "5 min sin `CHAT_MESSAGE_EVENT`" NO implica socket muerto en Kick.

## Problema

El watchdog de Kick usa "sin mensajes de chat" como proxy de "conexión muerta",
pero el ping de Pusher desacopla ambas cosas. En canales tranquilos el proxy es
un falso positivo constante.

## Pasos para reproducir

1. Conectar un canal de Kick con chat lento o vacío (streamer con pocos viewers, o fuera de horario).
2. Esperar 5 min sin que nadie escriba.
3. Observar `canales.kick.sin_eventos` + `reconectando (motivo: stale)` cada 5 min exactos.

## Comportamiento esperado

Elegir una (la más simple que resuelva):

**A.** Que el watchdog de Kick se re-arme también con las señales de vida que no
son chat: `pusher_internal:subscription_succeeded`, los pong del ping, cualquier
frame recibido. Si el socket recibe *algo* (aunque no sea chat), no está muerto
→ no reconectar. Solo dispara si NO llega ningún frame en el timeout.

**B.** Subir el timeout de Kick a algo tolerante (10–15 min) — más simple, pero
sigue siendo el proxy equivocado.

**C.** Si además se quiere sacar el ruido de GlitchTip sin cambiar la lógica:
que `canales.kick.sin_eventos` NO se promueva a issue (como ya se hace con
`sonido.tts.respuesta_pequena`) — pero esto solo tapa el síntoma en observabilidad,
el churn de reconexión sigue. Combinar C con A o B.

Recomendado: **A** (re-armar con cualquier frame) + **C** (bajar la severidad
del evento a `warn` no-promovido).

## Alcance / archivos involucrados

- `features/canales/kick/stale-watchdog.js` — timeout / lógica de re-arme.
- `features/canales/kick/connect-kick.js` — dónde se re-arma el watchdog (hoy solo en el branch de `CHAT_MESSAGE_EVENT`, ~L130); agregar re-arme en la recepción de cualquier frame / en el pong.
- `electron-shell/glitchtip.js` — si se baja la severidad de `canales.kick.sin_eventos` para que no sea issue (ver también tarea 07, misma zona).
- `test/` — test: frames no-chat re-arman el watchdog; solo dispara con silencio total de frames.

## Criterios de aceptación

- [ ] Un canal de Kick sin chat pero con socket vivo (pings entrando) NO dispara `sin_eventos`.
- [ ] Un socket realmente muerto (ningún frame) sí dispara la reconexión, dentro del timeout.
- [ ] `canales.kick.sin_eventos` deja de aparecer como issue en GlitchTip (queda en Logs) — si se hace la parte C.
- [ ] `npm test` pasa.

## Notas / restricciones

- No romper el caso real que el watchdog cubre: si Kick vuelve a cerrar la API con Cloudflare o el WS de Pusher muere sin `close`, el watchdog es la red de seguridad (documentado en CLAUDE.md, sección Kick).
- Familia con la tarea 05 (calibrar watchdogs), archivos distintos.
- Si la tarea 07 se hace primero y ya sacó `canales.kick.sin_eventos` del pipeline de issues, acá solo queda la parte A (lógica de re-arme).
