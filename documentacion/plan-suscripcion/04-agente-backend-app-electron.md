# Agente 04 — Backend de la aplicación (Electron)

## Objetivo

Implementar en la app el dominio `features/auth/`: flujo de registro/login/logout
contra `servicio-cuentas`, store de sesión persistente, contrato síncrono
`bus.on('auth:get')` para que otros dominios consulten el estado, y el **gating**
de las funciones avanzadas según si el usuario tiene suscripción Pro activa.
Expone tools MCP y un state provider. Todo detrás del feature flag
`subscriptionsEnabled` (default `false`) — con el flag apagado la app se comporta
igual que hoy.

## Dependencias explícitas

- **Gate A** (esquema Supabase estable) y **Gate B** (`02-contrato-http.md`
  congelado). El agente 04 programa **contra el contrato**, no lee el código de
  `servicio-cuentas`.
- `03-contrato-checkout.md` — para saber a qué endpoint pedir la URL de checkout
  (aunque el botón lo dibuja el agente 05, el proxy va por acá).
- Lectura previa obligatoria de estos archivos del repo (patrones a replicar):
  - `server.js` — lista de `registerDomain(...)`, orden.
  - `core/register-domain.js` — contrato `{ name, register, shutdown }`.
  - `core/event-bus.js` — `bus.on(evento, fn, dominio)`, callback síncrono.
  - `features/configuracion/index.js` + `store.js` + `apply-patch.js` +
    `default-config.js` + `validators.js` — cómo se agrega una clave de config y
    el contrato `config:get`.
  - `features/canales/twitch/oauth/auth-tokens-store.js` — patrón de store de
    tokens en `DATA_BASE`.
  - `features/telemetria/transport.js` — `undici` + `AbortSignal.timeout` + retry.
  - `features/mcp/PROTOCOL.md` + `core/contracts/mcp-registry.js` — registro de
    tools, `destructive`, state provider.
  - `electron-shell/glitchtip.js` (`EVENTO_A_TIPO`) y `electron-shell/aptabase.js`
    — dónde se mapean los eventos de log nuevos.

## Contrato de entrada

| Artefacto | De quién | Uso |
|---|---|---|
| `02-contrato-http.md` | agente 02 | Rutas, request/response, errores de `servicio-cuentas`. Única fuente. |
| `03-contrato-checkout.md` | agente 03 | Endpoint `POST /api/checkout`, querystring de retorno. |
| `00-ORQUESTADOR.md` — Nomenclatura + gates | orquestador | Nombres `features/auth/`, `auth:get`, `auth:actualizado`, `auth-updated`, `auth-session.json`, `cuentas.json`, `subscriptionsEnabled`. |
| Lista de features avanzadas a gatear | **el propio agente 04 la define** en la tarea 3 y la pasa al agente 02 para seedear `entitlements`. |

## Contrato de salida

1. **Dominio `features/auth/`** montado en `server.js` (entre `configuracion` y
   `mcp`), con:
   - `index.js` — `register({app, bus, logger})` / `shutdown()`.
   - `config-servicio.js` — resuelve la URL de `servicio-cuentas`: `process.env.CUENTAS_URL`
     → `%APPDATA%/tiktok-live-tts/cuentas.json` campo `url` → bundled
     `cuentas-config.json` → sin URL ⇒ dominio en modo no-op (igual que telemetría
     sin `TELEMETRY_URL`). Patrón `main.js#readJsonField`.
   - `cliente-servicio.js` — `undici` fetch contra `servicio-cuentas`, un método
     por endpoint del contrato, timeout + retry + mapeo de error.
   - `session-store.js` — `DATA_BASE/auth-session.json`: `{ token, user, plan,
     entitlements, expiresAt, cachedAt }`. `load`/`save`/`clear`, escritura
     atómica `.tmp`+`rename`. Patrón `auth-tokens-store.js`.
   - `routes/*.js` — `POST /api/auth/register`, `POST /api/auth/login`,
     `POST /api/auth/logout`, `GET /api/auth/session`, `PATCH /api/auth/account`,
     `POST /api/auth/checkout` (proxy al servicio, agrega el token). Cada ruta
     reenvía al `cliente-servicio.js` y propaga `{ error, errorKey }`.
   - `refresh.js` — revalida la sesión contra `GET /api/session` del servicio en
     un intervalo (p. ej. cada 10 min) y al arrancar; actualiza el store; emite
     `auth:actualizado` + `ws:broadcast {type:'auth-updated'}` si algo cambió.
     TTL de gracia: si el servicio no responde, mantiene el cache hasta
     `cachedAt + TTL`; pasado el TTL degrada a `plan:'free'` (fail-safe).
2. **Contrato de gating** `core/contracts/entitlements.js` (singleton, patrón
   `core/contracts/moderacion-policy.js`): `entitlements.check(featureId) → boolean`.
   Lo inyecta `features/auth/`. Fail-safe: si algo lanza, devuelve `false`
   (bloquea) y loguea `auth.gating.fallo_check`.
3. **Consumo del gate** en los dominios con features Pro: cada uno llama
   `entitlements.check('<featureId>')` en el punto de entrada de esa feature. Si
   `subscriptionsEnabled` está `false`, `check()` devuelve `true` siempre (todo
   desbloqueado, comportamiento actual).
4. **Feature flag** `subscriptionsEnabled: false` en `default-config.js` +
   validador booleano en `validators.js`. Opcional sub-flag `checkoutEnabled`.
5. **Tools MCP** en `features/auth/index.js`:
   - `auth_status` (`readOnly:true`) → `{ signedIn, email, plan, entitlements, expiresAt }` (sin token).
   - `auth_logout` (`destructive:true`) → cierra sesión local.
   - `registerStateProvider(() => ({ auth: { signedIn, plan, entitlements } }), 'auth')`.
   - Agregar `auth` a `CON_ESCRITURA` en `test/mcp-registry.test.js`.
6. **Eventos de log** `auth.*` definidos y mapeados en `glitchtip.js` + `aptabase.js`.
7. **`04-contrato-sesion.md`** — para el agente 05: forma exacta del objeto de
   sesión, evento WS, lista de endpoints `/api/auth/*` que el frontend puede
   llamar, y cómo el frontend pregunta "¿esta feature está desbloqueada?".
8. **`04-features-pro.md`** — la lista de `featureId` que son Pro, con la ruta del
   código donde va el `check()`. Se pasa al agente 02 para seedear `entitlements`.

## Tareas

- [ ] **1.** Leer el contrato (`02-contrato-http.md`, `03-contrato-checkout.md`) y
  los archivos-patrón listados en "Dependencias explícitas".
- [ ] **2.** Agregar `subscriptionsEnabled` (y opcional `checkoutEnabled`) a
  `default-config.js` + validador en `validators.js`. Confirmar que `PATCH /api/config`
  lo acepta y `bus.emit('config:actualizado')` lo propaga.
- [ ] **3.** Definir la **lista de features Pro**. Delegar en el **auxiliar de
  inventario de features** para mapear qué features "avanzadas" existen hoy y
  dónde está su punto de entrada. Escribir `04-features-pro.md` con
  `featureId → descripción → archivo:función donde va el check`.
- [ ] **4.** Crear `features/auth/config-servicio.js` (resolución de URL, patrón
  `resolveTelemetryUrl`). Sin URL ⇒ `enabled = false`.
- [ ] **5.** Crear `features/auth/cliente-servicio.js`: un método por endpoint del
  contrato (`register`, `login`, `logout`, `session`, `account`, `checkout`),
  `undici` + `AbortSignal.timeout(8000)` + 2 reintentos ante red/timeout (no ante
  4xx), mapeo de la respuesta de error a `{ error, errorKey }`.
- [ ] **6.** Crear `features/auth/session-store.js` (patrón `auth-tokens-store.js`):
  `load()`, `save(session)`, `clear()`, escritura atómica. Nunca loguear el token.
- [ ] **7.** Crear `features/auth/routes/*.js` — 6 rutas. Todas detrás de un guard
  `if (!subscriptionsEnabled) return res.status(404)` salvo que se decida otra
  cosa. `checkout` agrega el token del store antes de reenviar.
- [ ] **8.** Crear `features/auth/refresh.js`: revalidación periódica + al arranque,
  TTL de gracia, degradación a `free`, emisión de `auth:actualizado` +
  `ws:broadcast {type:'auth-updated'}` en cada cambio.
- [ ] **9.** Crear `core/contracts/entitlements.js` (singleton, patrón
  `moderacion-policy.js`): `check(featureId)`. Implementado en `features/auth/`
  (mira `subscriptionsEnabled` → si off `true`; si on, `session.entitlements.includes(featureId)`).
  Fail-safe `false` + log.
- [ ] **10.** `features/auth/index.js`: `register()` monta rutas, arranca
  `refresh.js`, inyecta el contrato `entitlements`, registra el `bus.on('auth:get',
  respond => respond(sessionStore.load()))`, registra los 2 tools MCP y el state
  provider. `shutdown()` detiene el timer de refresh.
- [ ] **11.** Agregar `registerDomain(deps, require('./features/auth'))` a
  `server.js` **entre `configuracion` y `mcp`**.
- [ ] **12.** Cablear el gate en cada feature Pro de `04-features-pro.md`: un
  `if (!entitlements.check('<id>')) { return res.status(403).json({ error, errorKey:'errors.proRequired' }); }`
  (para rutas) o el equivalente en el handler de bus / IPC. **No duplicar la
  lógica** — siempre vía el contrato.
- [ ] **13.** Definir los eventos de log `auth.*`
  (`auth.sesion.iniciada`/`cerrada`/`expirada`, `auth.servicio.error`,
  `auth.gating.bloqueado`/`fallo_check`, `auth.checkout.solicitado`) y mapearlos
  en `electron-shell/glitchtip.js#EVENTO_A_TIPO` y `electron-shell/aptabase.js`.
- [ ] **14.** Escribir `04-contrato-sesion.md` y confirmar que
  `bus.emit('auth:get', s => …)` devuelve exactamente esa forma (con datos mock si
  el servicio aún no está desplegado).
- [ ] **15.** Tests: `test/auth-domain.test.js` (boot del dominio sin URL = no-op,
  no crashea; con URL mock, round-trip login → `auth:get` → logout) y actualizar
  `test/mcp-registry.test.js` (`auth` en `CON_ESCRITURA`). Correr `npm test` +
  `node scripts/check-mcp.js`.
- [ ] **16.** Verificar el rollback: con `subscriptionsEnabled=false`, `npm test`
  del resto de la app pasa igual, las features Pro responden normal, ninguna ruta
  `/api/auth/*` existe (404).
- [ ] **17.** Actualizar `HANDOFF.md`: agente 04 a "hecho", marcar **Gate D**
  (contrato de sesión definido). Pasar `04-features-pro.md` al agente 02 para el
  seed de `entitlements`.

## Criterios de "hecho"

1. `server.js` lista `auth` entre `configuracion` y `mcp`; el boot loguea `core.dominio.montado` para `auth`.
2. Sin `CUENTAS_URL` ni `cuentas.json`: el dominio arranca en no-op, `npm start` de la app funciona igual que hoy, cero requests de red desde `features/auth/`.
3. Con un `servicio-cuentas` mock: `POST /api/auth/register` → `POST /api/auth/login` deja `auth-session.json` con token; `bus.emit('auth:get', s => …)` devuelve `{ user, plan, entitlements, expiresAt }`; `POST /api/auth/logout` limpia el store.
4. `subscriptionsEnabled=false` ⇒ `entitlements.check('<cualquier-id>')` devuelve `true`; las features Pro responden normal.
5. `subscriptionsEnabled=true` + usuario `free` ⇒ `check('<id-pro>')` devuelve `false`; la ruta de esa feature devuelve `403 { errorKey:'errors.proRequired' }`.
6. `subscriptionsEnabled=true` + usuario `pro` ⇒ `check('<id-pro>')` devuelve `true`.
7. `node scripts/check-mcp.js` pasa (el dominio monta rutas y registra tools); `test/mcp-registry.test.js` incluye `auth` y pasa.
8. `get_state` (MCP) incluye la clave `auth` con `{ signedIn, plan, entitlements }`.
9. El token nunca aparece en logs (grep de `token` en los eventos `auth.*` no muestra el valor).
10. `04-contrato-sesion.md` y `04-features-pro.md` existen y están completos.
11. `refresh.js`: si el servicio devuelve `503` durante más que el TTL, el estado cae a `free` y se loguea `auth.sesion.expirada`.
12. `HANDOFF.md` marca Gate D.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Inventariar las features "avanzadas" actuales y su punto de entrada (tarea 3) | **auxiliar de inventario de features** (Explore, read-only) | "Listá las features de la app que serían candidatas a 'Pro' (overlays, bot musical, soundpad, MCP, panel móvil, clips, etc.). Por cada una: dominio, archivo y función que es el punto de entrada (ruta HTTP, handler de bus o IPC)." | Tabla feature → dominio → `archivo:función`. El agente 04 decide cuáles son Pro. |
| Revisar que el gate esté puesto en el lugar correcto (tarea 12) | **auxiliar de revisión de gating** (Explore/Plan, read-only) | El diff de `features/auth/` + la lista de puntos donde se agregó `entitlements.check()`. "Confirmá: ¿algún camino alternativo llega a la feature Pro sin pasar por el check? ¿El check está antes de cualquier efecto secundario?" | Lista de huecos, o "sin huecos". |
| Seedear `entitlements` en Supabase con `04-features-pro.md` | **agente 02** | El archivo `04-features-pro.md` (lista `featureId → plan_id`). | Confirmación de las filas insertadas (`execute_sql` count). |
| Escribir `04-contrato-sesion.md` | **nadie** — lo hace el agente 04 | — | — |

Motivo: el inventario de features recorre casi todo el repo — output grande que el
agente 04 no necesita entero, solo la tabla resultante. La revisión de gating es
un segundo par de ojos sobre un tema de seguridad (bypass del paywall).

## Riesgos y rollback

- **Bypass del gate** — el riesgo central. Regla: el `check()` va en el **único**
  punto de entrada de cada feature (el mismo lugar donde `features/chat/emit-chat-message.js`
  centraliza la moderación). Si una feature tiene dos entradas, gatear las dos o
  unificarlas primero.
- **Fail-open accidental** — `entitlements.check()` debe fallar a `false`
  (bloquear), nunca a `true`. Al revés que la moderación (que es fail-open a
  propósito). Test explícito para esto.
- **Sesión robada** — el token de `auth-session.json` da acceso a la cuenta. Vive
  solo en `DATA_BASE` (userData del usuario), nunca se sincroniza, nunca sale por
  telemetría/GlitchTip (el `sanear()` de esos módulos ya recorta rutas de home;
  agregar el token a la lista de campos a nunca loguear).
- **Servicio caído en el arranque** — `register-domain.js` aísla el fallo; la app
  sigue sin cuentas. `refresh.js` reintenta en background.
- Rollback: `subscriptionsEnabled=false` (runtime, `PATCH /api/config`) desactiva
  todo el subsistema sin re-deploy. La rama de `features/auth/` no se mergea hasta
  que el agente 06 (QA) da el OK.
