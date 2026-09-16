# Handoff de sesión — Reescritura del dominio TikTok, auditoría de conexión intermitente, release v1.9.1 y setup de graphify

**Fecha de la sesión:** 2026-09-13 (redactado 2026-09-14)
**Repo:** `C:\Users\liber\OneDrive\Documentos\tiktok-tts` (GitHub: `iKhunsa/tiktok-tts`)
**Repo hermano relevante:** `C:\Users\liber\OneDrive\Documentos\tiktok-live-client` (fuente del paquete `@tiklivetts/tiktok-live-client`, no es submódulo, es un checkout aparte)
**Branch de trabajo:** `Dev-2-nuevo-backend`
**Último commit al cierre de la sesión:** `a41cc3e` (`chore(release): v1.9.1 (prerelease) — cliente TikTok propio verificado en vivo`)

Este documento es para que otra IA (o la misma, en otra sesión) retome el trabajo sin releer todo el historial de chat. Está ordenado cronológicamente por lo que pasó, con una sección final de "qué falta" y "qué no repetir".

---

## 0. Contexto que hay que tener antes de leer el resto

- La app es un lector de TTS para chat de TikTok/Twitch/YouTube/Kick, Electron + Express en el mismo proceso. Ver `CLAUDE.md` del repo (raíz) para la arquitectura completa por dominios — **no lo repito acá**, asumí que quien retome esto ya lo leyó.
- TikTok Live no tiene API oficial de terceros. Esta app usa un paquete **propio** (`@tiklivetts/tiktok-live-client`, del mismo autor/organización, repo separado) que resuelve la firma anti-bot navegando de verdad a la página de TikTok en una `BrowserWindow` de Electron invisible, y escucha por Chrome DevTools Protocol (CDP) el WebSocket ya autenticado. No usa Eulerstream ni ningún servicio de pago.
- Motivación de la sesión: el usuario sospechaba que ese paquete propio estaba roto, armó una demo aislada para probarlo, confirmó que **sí funciona** en aislamiento, y pidió reescribir la integración dentro de `tiktok-tts` "desde cero" para no arrastrar código legacy en el que no confiaba.

---

## 1. Reescritura del dominio `features/canales/tiktok/`

### Qué se pidió, y cómo cambió el alcance en el camino

1. Pedido inicial: "eliminar todo lo de TikTok actual y reescribir usando el paquete propio". Investigación mostró que **el código actual ya usaba ese paquete** (no era una migración de librería) — el pedido real era reescribir la capa de integración, no cambiar de librería.
2. Primer plan propuesto: reescribir "estilo demo" — simple, sin debounce/watchdog/timeout/backoff.
3. **El usuario rechazó ese plan explícitamente**: *"piensa como agg esto para que no quede libre con logistica nueva desde 0 sin fijarse en lo antiguo"*. No quería perder protecciones que ya resolvían bugs reales documentados.
4. Plan final ejecutado: reescribir el código (archivos nuevos, estructura nueva) pero **preservando el comportamiento** de 4 protecciones existentes.

### Archivos tocados (commit `3600d31`)

- `features/canales/tiktok/connect-tiktok-channel.js` — reescrito completo.
- `features/canales/tiktok/reconnect-tiktok.js` — reescrito completo.
- `features/canales/routes/disconnect.js`, `remove-channel.js`, `platforms-disconnect.js` — se unificó el teardown manual duplicado (ahora todas usan `teardownConn` exportado desde `connect-tiktok-channel.js`).
- `features/canales/index.js` — el `shutdown()` también usa `teardownConn` ahora.
- **Sin cambios**: `clean-username.js`, `cleanup-after-last-channel.js` (triviales, no formaban parte de lo que se estaba simplificando).

### Las 4 protecciones que se mantuvieron (no tocar sin discutirlo primero)

1. **Debounce de combos de regalo** (`GIFT_COMBO_DEBOUNCE_MS = 1500`) — el paquete emite `gift` en cada tick de un combo con `groupCount` acumulado, sin señal de "combo cerrado". Sin debounce, el overlay de OBS dispararía una alerta por tick en vez de una al final.
2. **Stale-watchdog** (`WATCHDOG_TIMEOUT_MS`, 5 min sin `chat`) — fuerza reconexión si el WS interno de TikTok muere sin que la ventana invisible se cierre (el evento `disconnected` del paquete solo dispara cuando la ventana se destruye, no cuando el WS interno muere solo).
3. **Timeout anti-cuelgue de 30s** en `connectTiktokChannel` (`CONNECT_TIMEOUT_MS`) — evita que el lock `state.connectingTiktok` quede tomado para siempre si `connect()` nunca resuelve.
4. **Backoff exponencial con tope** (`MAX_RECONNECT_ATTEMPTS = 5`, de `../state/channel-maps`) — evita reintentar para siempre contra un canal que dejó de transmitir.

### Contrato externo que NO cambió (y no debe cambiar sin auditar todos los consumidores)

Eventos de bus: `canal:mensaje-crudo`, `canal:gift`, `canal:like`, `canal:follow`, `canal:evento-especial` (kind `join`/`share`), `canal:estado` (states `conectando`/`conectado`/`reconectando`/`error`/`desconectado`/`sin-canales`/`followers-refrescado`/`lista-canales`). Consumido por `features/chat/`, `features/moderacion/`, `features/overlay/`, `features/mcp/`.

### Verificación hecha en su momento

`npm test` → 148/148 OK. Servidor arranca limpio (`/api/status` responde). Esto **no prueba que la conexión real a TikTok funcione** — eso es un tema aparte, ver sección 2.

---

## 2. Auditoría de la falla intermitente "conexión fallida" / `NotLiveError`

### El síntoma

Después de la reescritura, se probó conectar a un canal **confirmado en vivo** y falló con `NotLiveError: The requested user isn't online :(`. El usuario pidió auditar si era un bug de la reescritura, de la app en general, o del paquete.

### Metodología: eliminación sistemática, no adivinanza

Se instrumentó temporalmente (`console.error`, revertido después con `npm install`) `node_modules/@tiklivetts/tiktok-live-client/src/signing/live-window.js` en el punto donde decide "vacío → rechazar". Resultado: **`Network.getResponseBody` (CDP) devuelve body vacío** (`bodyLength:0`, `parseError:"Unexpected end of JSON input"`), no un JSON real de TikTok diciendo "offline".

Se descartaron, con pruebas reales (no solo lectura de código), en este orden:

| # | Hipótesis | Cómo se descartó |
|---|---|---|
| 1 | El paquete está roto | Script aislado (mismo canal, mismo momento) conectó bien, con `followerCount` real |
| 2 | Sesión de TikTok persistida "quemada" (H1 del plan original) | Se borró `%APPDATA%\tiktok-live-tts\Partitions\tiktok-live-client\` completa → **siguió fallando** igual |
| 3 | Configuración global de Electron/Chromium (sandbox, `appendSwitch`, `webRequest`, CDP competido) | Grep exhaustivo del repo: cero coincidencias. Versión de Electron instalada coincide exacto con la que testea el paquete |
| 4 | GlitchTip/Sentry usando `webContents.debugger` sobre la misma ventana | Sí existe esa integración (ANR watchdog), pero solo se activa vía preload en `session.defaultSession` — la ventana de TikTok usa otra partición, nunca lo recibe |
| 5 | Ventana principal visible interfiriendo | Replicado: ventana real + servidor + TikTok en el mismo script → conectó bien |
| 6 | Express+WS+16 dominios interfiriendo | Replicado sin ventana → conectó bien |
| 7 | GlitchTip+Aptabase+uiohook activos (orden real de `main.js`) | Replicado todo junto → conectó bien |
| 8 | La ruta específica `%APPDATA%\tiktok-live-tts` | Se copió el `userData` real completo (116MB) a `C:\tiktok-userdata-copy-test` → conectó bien ahí, con el mismo contenido |
| 9 | Roaming (`%APPDATA%`) vs Local (`%LOCALAPPDATA%`) | Se probó relocalizar `app.setPath('sessionData', ...)` a ambos → **siguió fallando en los dos** |

Después de descartar #9, se revirtió el cambio de `sessionData` en `main.js` (no quedó nada de esto en el código — se confirmó con `git diff` que `main.js` no tiene cambios).

### Conclusión de la auditoría (no 100% cerrada)

El fallo **no es determinístico** — la app real, sin ningún cambio de código, en una corrida posterior conectó bien contra el mismo canal. Eso es consistente con lo que el propio comentario del paquete ya documentaba:

```js
// live-window.js, línea ~35
// parece una falla transitoria de Network.getResponseBody bajo carga del
// proceso principal
```

Ninguna prueba aislada logró *reproducir* el fallo bajo condiciones controladas — solo se pudo confirmar que la app real (`npm run electron`) a veces falla y a veces no, con el mismo código, mismo canal, mismo entorno.

**Este es el punto donde el usuario decidió pausar la investigación empírica (probar variables) y pasar a auditar la lógica del código directamente** — ver sección 3.

---

## 3. Análisis de código de `live-window.js` (sin ejecutar nada)

A pedido del usuario, se hizo un análisis puramente de lectura de código (comparando el repo fuente `tiktok-live-client` con la copia instalada — **confirmado idénticos por `diff`**, mismo `version: "0.1.3"` en ambos `package.json`) sobre cómo el paquete vincula la respuesta de `room/enter/` con su body.

### Hechos verificados en el código (no hipótesis)

1. **Vinculación por `requestId` de CDP**, en dos eventos separados:
   ```js
   if (method === 'Network.responseReceived' && ROOM_ENTER_PATTERN.test(params.response.url || '')) {
     pendingRoomEnter.set(params.requestId, true);
   }
   ...
   if (method === 'Network.loadingFinished' && pendingRoomEnter.has(params.requestId)) {
     pendingRoomEnter.delete(params.requestId);
     this.dbg.sendCommand('Network.getResponseBody', { requestId: params.requestId })
   ```
2. `Network.enable` se llama **sin parámetros** de tamaño de buffer (`maxResourceBufferSize`/`maxTotalBufferSize`) — usa los defaults de Chromium.
3. **Solo la primera respuesta de `room/enter/` que complete decide el resultado.** Cualquier otra respuesta posterior a una URL que matchee ese patrón se ignora por el guard `if (resolved) return;`.
4. **`this.win.destroy()` se ejecuta en el mismo instante que se rechaza** (rama de body vacío/inválido) — esto corta cualquier request en curso en esa ventana, incluida una segunda `room/enter/` que estuviera esperando su `loadingFinished`.
5. El `.catch(() => { /* best-effort */ })` sobre `Network.getResponseBody` **silencia cualquier error explícito de CDP** (por ejemplo, "No resource with given identifier found", el error típico cuando el body ya fue evictado del buffer) — si eso pasara, la promesa externa nunca resolvería ni rechazaría, y el flujo terminaría en `SigningError` por timeout de 30s, no en `NotLiveError`. **Dato relevante**: en los fallos observados en esta sesión, el error siempre fue `NotLiveError` (no `SigningError`), lo que sugiere que `getResponseBody` sí resolvió (no rechazó) pero con contenido vacío — no se pasó por esta rama del catch silencioso, aunque no hay un log explícito que lo confirme al 100%.

### Hipótesis derivada, evaluada pero NO confirmada ni descartada

**"¿Una primera respuesta vacía de `room/enter/` le impide al código aprovechar una segunda respuesta posterior que sí tuviera datos válidos?"**

- **Mecánicamente posible según el código** (puntos 3 y 4 de arriba) — esto es un hecho demostrado leyendo el código.
- **No hay evidencia en los logs existentes** de que esto haya ocurrido de verdad — no se registró nunca, y de hecho el diseño actual (destruye la ventana al rechazar) haría que, aunque hubiera pasado, no quedara rastro salvo que se agregue instrumentación específica para verlo.

---

## 4. Propuesta de prueba diagnóstica — ACORDADA, NO IMPLEMENTADA

Esto es lo más importante que debe retomar quien siga esta sesión: **hay una prueba diseñada y refinada en conjunto con el usuario, pendiente de implementar y correr.**

### Pregunta que responde

Cuando `_connectOnce()` recibe un `room/enter/` con body vacío, **¿llega después, dentro de una ventana de 3 segundos, otra respuesta de `room/enter/` con datos válidos (`status === 2`) en esa misma `BrowserWindow`?** Y si llega, ¿esa solicitud ya estaba en curso antes del rechazo, o es una nueva que la página de TikTok disparó después?

### Diseño acordado (5 rondas de corrección con el usuario, ya resueltas)

1. **Atar la observación a la ventana correcta**: capturar `this.win`/`this.dbg` en variables **locales** en el momento del rechazo (no releer `this.win` después, porque el reintento automático del paquete lo reasigna).
2. **No superponer ventanas/logs**: cada línea de log lleva `webContents.id` de esa ventana específica como tag, para poder reconstruir en el informe qué pertenece a qué intento aunque dos ventanas convivan (el reintento automático a 500ms puede arrancar antes de que termine la observación de 3s de la anterior).
3. **El registro no debe cortarse por `if (resolved) return`**: separar "loguear" (incondicional) de "decidir el resultado de la promesa" (sigue gateado por `resolved`, como hoy).
4. **Probarlo en la app real con la copia modificada**: editar directamente `tiktok-tts\node_modules\@tiklivetts\tiktok-live-client\src\signing\live-window.js` (no el repo fuente, que queda de referencia limpia). Alcanza con relanzar `npm run electron` — Node no cachea el archivo entre procesos.
5. **Tope de 5 intentos reales totales** (contando reintentos automáticos internos del paquete, no solo clics manuales en "Conectar") vía un contador a nivel de módulo, y **un solo informe final** consolidado (no un log por línea suelto).

### Qué cambiaría temporalmente (y cómo revertir)

Solo dentro de `node_modules\@tiklivetts\tiktok-live-client\src\signing\live-window.js`:
- Logs (`console.error`) en los eventos `responseReceived`/`loadingFinished` de `room/enter/`.
- El `destroy()` en la rama de rechazo pasa de inmediato a diferido 3s.
- Contador de tope de 5 intentos.

**Nada de esto toca `features/canales/tiktok/` ni ningún otro archivo del repo `tiktok-tts`.**

**Para revertir**: `npm install` en `tiktok-tts` (reinstala la copia limpia desde GitHub Packages) — ya se hizo esto una vez en esta sesión para la instrumentación anterior y funcionó bien. `node_modules` está en `.gitignore`, así que nada de esto pasa por git.

### Matriz de interpretación de resultados (ya acordada)

| Resultado | Interpretación |
|---|---|
| Llega una respuesta válida en esa ventana, dentro de 3s | Apoya la hipótesis (indicar si "ya en curso" o "nueva") |
| No llega ninguna respuesta adicional | Debilita la hipótesis, **no demuestra otra causa** |
| Llega otra respuesta pero también vacía/inválida | Ni confirma ni descarta del todo |
| Ninguno de los 5 intentos reproduce el body vacío | **Inconcluso** (ya pasó antes — el fallo es intermitente) |

### Estado: el usuario preguntó "¿querés que la implemente ahora?" y la sesión terminó ahí sin respuesta — **retomar preguntando si procede a implementarla**, no asumir que sí.

---

## 5. Release v1.9.1 (prerelease) — publicado, con un problema resuelto en el camino

### Qué se hizo

- Bump de versión `1.8.12 → 1.9.1` en `package.json`.
- Entrada nueva en `CHANGELOG.md` documentando la reescritura del dominio y la limitación conocida (no bug) de la conexión intermitente.
- Commit `a41cc3e`, push a `Dev-2-nuevo-backend`, tag `v1.9.1` → disparó `.github/workflows/release.yml` (test en Linux + build/publish NSIS en Windows) → completó OK.

### El problema que apareció y cómo se resolvió

`gh release edit v1.9.1` no encontró el release real (que estaba en estado `draft` bajo la URL fea `untagged-<hash>`, comportamiento normal de GitHub para drafts) y en su lugar **creó un release duplicado vacío** en la URL limpia `v1.9.1` (sin el `.exe`, solo con un `.blockmap` suelto). El usuario instaló desde la URL `untagged-...` y reportó que la conexión a TikTok fallaba (síntoma esperado, ver sección 2 — el instalador en sí estaba bien).

**Resuelto**: se borró el release duplicado vacío (`gh api -X DELETE .../releases/387789556`) y se editó el release real (id `387789557`, el que tenía `TikTok-TTS-Setup-1.9.1.exe` de 307MB + `latest.yml`) directamente por `gh api -X PATCH` para marcarlo `prerelease:true, draft:false` con las notas correctas.

### Estado final del release

**https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.9.1** — prerelease publicado, con el `.exe` real y `latest.yml`. Sin duplicados.

**Nota para quien retome**: si se hace OTRO release en el futuro, tener cuidado con este mismo problema — `gh release edit <tag>` puede fallar en encontrar un release que electron-builder subió como draft recién creado. Verificar con `gh api repos/iKhunsa/tiktok-tts/releases --jq '.[] | select(.tag_name=="vX.Y.Z")'` que haya **un solo** release por tag antes de editar, no asumir que `gh release edit` lo encontró bien.

---

## 6. Integración de graphify (grafo de conocimiento del repo)

### Qué se instaló

1. `graphify claude install` → agregó sección `## graphify` a `CLAUDE.md` (instruye a Claude Code a consultar `graphify-out/GRAPH_REPORT.md`/`graphify query`/`path`/`explain` antes de grepear archivos sueltos) + un hook `PreToolUse` en `.claude/settings.json` (local, gitignorado) que recuerda esto cuando se corre `grep`/`find`.
2. `graphify hook install` → hooks `post-commit` y `post-checkout` en `.git/hooks/` que reconstruyen el grafo automáticamente (solo AST, gratis) después de cada commit/checkout.

### Estado del grafo al cierre de la sesión

Se corrió `graphify update .` (AST completo, gratis) + extracción semántica de los 77 archivos de documentación (excluyendo a propósito 2341 imágenes estáticas de `asset/`/`gifts/`, que no aportan nada a un grafo de arquitectura — decisión explícita del usuario). Resultado: **6551 nodos, 13071 relaciones, 424 comunidades**, en `graphify-out/graph.json` + `graphify-out/GRAPH_REPORT.md`.

`graph.html` **no** se regeneró — el grafo pasó las 5000 nodos, límite de la visualización HTML de graphify. Si hace falta verlo visualmente, hay que correr `/graphify` con `--no-viz` desactivado y un corpus más chico, o aceptar que no hay visual y usar `graph.json`/`GRAPH_REPORT.md` directamente (que es lo que ya usa la integración con Claude Code).

**Nota menor no resuelta**: el reporte tiene un bug cosmético de encoding en Windows — tildes en español salen mal (`auditoría` → `auditorÃ­a`) en algunas líneas de `GRAPH_REPORT.md`. Es un bug de graphify, no de este repo. No se investigó más a fondo, no bloquea nada funcional.

---

## 7. Qué NO hacer / qué ya se descartó (para no repetir trabajo)

- **No volver a sospechar de**: el paquete en sí, la sesión persistida, la ventana principal, Express/WS/dominios, GlitchTip, Aptabase, uiohook-napi, la ruta de `userData` (Roaming vs Local) — todo esto ya se probó con evidencia real, no solo lectura de código (ver sección 2, tabla).
- **No reabrir el aislamiento de proceso** (correr el signing en un proceso Electron separado) sin revisar primero por qué se revirtió antes (`c76f377`, commit previo a esta sesión) — falló específicamente en builds NSIS empaquetados, nunca se validó a fondo por qué.
- **No asumir que el fallo es 100% reproducible** — es intermitente. Un solo intento exitoso (o fallido) no prueba nada; hace falta la metodología de varios intentos + comparación de entornos, como se hizo en la sección 2.
- **No editar `node_modules` como fix permanente** — cualquier cambio ahí es temporal y se pierde en el próximo `npm install`. Si la prueba de la sección 4 confirma la hipótesis, el fix real tendría que ir al repo fuente `tiktok-live-client` y publicarse como nueva versión del paquete.

---

## 8. Archivos clave para orientarse rápido

| Qué | Dónde |
|---|---|
| Dominio TikTok reescrito | `features/canales/tiktok/connect-tiktok-channel.js`, `reconnect-tiktok.js` |
| Paquete instalado (copia que corre la app) | `node_modules/@tiklivetts/tiktok-live-client/src/signing/live-window.js` |
| Repo fuente del paquete | `C:\Users\liber\OneDrive\Documentos\tiktok-live-client\src\signing\live-window.js` |
| Plan de auditoría original (H1/H2/H3) | `C:\Users\liber\.claude\plans\mira-viste-que-tenemos-memoized-pumpkin.md` |
| Changelog de esta sesión | `CHANGELOG.md`, entrada `[1.9.1]` |
| Release publicado | https://github.com/iKhunsa/tiktok-tts/releases/tag/v1.9.1 |
| Grafo de conocimiento del repo | `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md` |
| Este handoff | `Docu 2/handoff-sesion-tiktok-2026-09-13.md` |

---

## 9. Próximo paso sugerido (no decidido, preguntar al usuario)

Implementar y correr la prueba diagnóstica de la sección 4 (grace-period de 3s + logs por `webContents.id` + tope de 5 intentos + informe único) para responder si la hipótesis de "primera respuesta vacía tapa una segunda válida" tiene sustento real, antes de proponer cualquier cambio de código definitivo — ni en `tiktok-tts` ni en el paquete.
