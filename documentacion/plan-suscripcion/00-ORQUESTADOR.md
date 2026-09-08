# Orquestador — sistema de suscripción freemium (TikLive TTS)

Plan agéntico de Nivel 1. Este documento es el índice del set y la especificación
del **agente orquestador**: define las fases en orden de dependencia, quién es
cada subagente y qué contrato tiene con los demás, los puntos de sincronización
que frenan el avance, y el manejo de errores/rollback a nivel proyecto.

Regla general del set (igual que `documentacion/plan-fases/`): español voseo,
headings ATX, rutas/eventos/comandos en backticks, `---` entre secciones grandes.
Los planes de subagente (`01`–`06`) usan **checkboxes numerados** en las tareas
(`- [ ] **N.** …`) y **lista numerada** en los criterios de "hecho".

---

## Contexto del proyecto

TikLive TTS es una app Electron de escritorio (repo `iKhunsa/tiktok-tts`) que hoy
se instala y se usa **sin registro de usuarios** — no hay tabla de usuarios en
ningún lado. Se quiere pasar a **freemium**:

- Cualquiera se registra gratis y sigue usando el **núcleo** de la app.
- Las **funciones avanzadas** se desbloquean solo con una **suscripción anual
  "Pro"** activa.

Infraestructura ya existente:

- **Supabase self-hosted** en un VPS de Hostinger → será la fuente de verdad de
  usuarios, planes y estado de cuenta.
- Dominio **`tiklivetts.es`** en Hostinger.
- Procesador de pagos: **Polar.sh**.
- **Telemetría propia** (`TikLiveTTS/telemetria-tts`) — backend modular
  self-hosted en Docker, patrón "un JS por función". Cualquier backend nuevo de
  auth/pagos sigue ese patrón, no un silo aparte.
- Backend de la app **por dominios** bajo `features/`, bus de eventos
  (`core/event-bus.js`), contratos síncronos inyectados (`core/contracts/*.js`),
  dominio MCP (`features/mcp/`).

## Decisión de arquitectura (tomada con el usuario)

> "La integración con Supabase y con Polar.sh se hará a través de servidores MCP."

**Interpretación acordada:** los servidores MCP (Supabase, Polar, Coolify,
Hostinger) son herramientas para los **agentes DEV** durante la implementación
(aprovisionar el proyecto Supabase, correr migraciones, crear el producto en
Polar, desplegar en Coolify). **La app Electron en runtime NO habla MCP.**

En runtime:

- La app usa **REST** (`undici`, mismo patrón que el OAuth de Twitch en
  `features/canales/twitch/oauth/`).
- Existe un **servicio server-side en el VPS** (nuevo, patrón `telemetria-tts`)
  que:
  - expone `/api/auth/*`, `/api/session`, `/api/entitlements` a la app;
  - recibe los **webhooks de Polar** (la app de escritorio no puede recibir
    webhooks);
  - es el **único** que escribe en Supabase (la app nunca toca Supabase directo).

Este servicio se llama **`servicio-cuentas`** en todo el set (repo nuevo o
carpeta en `telemetria-tts`, lo decide el agente 01).

## Nomenclatura congelada (idéntica en todos los docs)

| Concepto | Nombre |
|---|---|
| Dominio nuevo en la app | `features/auth/` |
| Servicio server-side en el VPS | `servicio-cuentas` |
| Contrato de lectura de sesión (bus) | `auth:get` |
| Evento de cambio de sesión (bus) | `auth:actualizado` |
| Mensaje WS al renderer | `auth-updated` |
| Store de sesión en disco (app) | `DATA_BASE/auth-session.json` |
| Config de servicio en la app (URL, claves) | `%APPDATA%/tiktok-live-tts/cuentas.json` |
| Feature flag maestro | `subscriptionsEnabled` (en `config.json`, default `false`) |
| Slice de estado en el frontend | `nucleo/estado/sesion.js` |
| Nombre del plan pago | `pro` |
| Tabla de desbloqueos | `entitlements` |

---

## Fases del proyecto (orden de dependencia)

```
Fase 0  Investigación            (agente 01)
          └─ Fase 1  Datos + servicio-cuentas   (agente 02)   ── Gate A, Gate B
                └─ Fase 2  Pagos Polar            (agente 03)   ── Gate C
                └─ Fase 3  Backend app            (agente 04)   ── Gate D
                      └─ Fase 4  Frontend app     (agente 05)
                            └─ Fase 5  QA e2e     (agente 06)
                                  └─ Fase 6  Despliegue
```

Las fases 2 y 3 pueden avanzar **en paralelo** una vez pasado el Gate B (ambas
dependen del contrato del servicio, no entre sí). La fase 4 necesita las dos
cerradas.

### Fase 0 — Investigación

- **Ejecuta:** agente 01.
- **Produce:** `01-hallazgos.md` con: qué tools expone el MCP de Supabase y el de
  Polar (y sus límites), decisión del modelo de webhook receiver, forma acordada
  del esquema de datos, contrato HTTP del `servicio-cuentas` (rutas, request,
  response, códigos de error), y si `servicio-cuentas` es repo nuevo o carpeta en
  `telemetria-tts`.
- **No arranca nada más hasta que este doc esté escrito y revisado por el
  usuario.**

### Fase 1 — Datos + `servicio-cuentas`

- **Ejecuta:** agente 02.
- **Produce:**
  - Migraciones versionadas del esquema (`users`, `plans`, `subscriptions`,
    `entitlements`) + políticas RLS, aplicadas al Supabase del VPS.
  - `servicio-cuentas` desplegable con `/api/auth/register`, `/api/auth/login`,
    `/api/auth/logout`, `/api/session`, `/api/entitlements` funcionando contra
    Supabase.
  - `02-contrato-http.md` — el contrato HTTP congelado.
- **Gate A:** esquema versionado y estable (ver más abajo).
- **Gate B:** `02-contrato-http.md` escrito y revisado.

### Fase 2 — Pagos Polar

- **Ejecuta:** agente 03.
- **Depende de:** Gate B.
- **Produce:**
  - Producto/precio "Pro anual" creado en Polar (vía MCP de Polar).
  - Endpoint de checkout: `servicio-cuentas` expone `POST /api/checkout` que
    devuelve la URL de Polar.
  - `POST /api/webhooks/polar` en `servicio-cuentas`: verifica firma, es
    idempotente por `event_id`, mapea eventos de suscripción → estado en
    `subscriptions` de Supabase.
  - Job de reconciliación (cron) que re-deriva estado desde la API de Polar.
- **Gate C:** webhook probado con un evento de prueba de Polar (sandbox) que
  llega, se procesa y deja `subscriptions.status = 'active'` en Supabase.

### Fase 3 — Backend de la app (Electron)

- **Ejecuta:** agente 04.
- **Depende de:** Gate A + Gate B.
- **Produce:**
  - Dominio `features/auth/` en la app: registro/login/logout contra
    `servicio-cuentas`, store `auth-session.json`, contrato `bus.on('auth:get')`,
    emisión de `auth:actualizado` + `ws:broadcast {type:'auth-updated'}`.
  - Gating: contrato `entitlements.check(featureId)` inyectado por `features/auth/`,
    consumido por los dominios que tienen features Pro.
  - Feature flag `subscriptionsEnabled` en `default-config.js` + validador.
  - Tools MCP (`auth_status` read-only, `auth_logout` destructive) + state
    provider `{ auth: { signedIn, plan, entitlements } }`.
- **Gate D:** el contrato `auth:get` y la forma del slice de sesión están
  documentados en `04-contrato-sesion.md` (lo consume el agente 05).

### Fase 4 — Frontend de la app (Electron/UI)

- **Ejecuta:** agente 05.
- **Depende de:** Gate D + endpoint de checkout de la Fase 2.
- **Produce:** vistas de registro, login, perfil, estado de plan, y
  upgrade/cancelación en `interfaz/`, usando el sistema de diseño actual. Slice
  `nucleo/estado/sesion.js`. Claves i18n en los 10 idiomas. Badge de plan en el
  sidebar. Gate visual en las features Pro (candado + CTA de upgrade).

### Fase 5 — QA end-to-end

- **Ejecuta:** agente 06.
- **Depende de:** fases 1–4 cerradas.
- **Produce:** `06-resultados-qa.md` con el resultado de cada flujo: usuario nuevo
  gratis, upgrade a Pro, cancelación, expiración, gating on/off, rollback por
  flag.

### Fase 6 — Despliegue

- **Ejecuta:** el orquestador (con MCP de Coolify/Hostinger).
- **Tareas:** desplegar `servicio-cuentas` en Coolify, cargar secrets (claves
  Polar, service-role de Supabase) como env del contenedor, apuntar
  `auth.tiklivetts.es` (o subdominio elegido) al servicio vía DNS de Hostinger,
  cortar release de la app con `subscriptionsEnabled` activable por etapas
  (primero interno, después %  de usuarios, después todos).

---

## Mapa de subagentes y contratos entre ellos

| Agente | Responsabilidad | Consume de | Entrega a |
|---|---|---|---|
| **01 Investigación** | Evaluar MCP Supabase/Polar, decidir webhook receiver, congelar forma de esquema y contrato HTTP | — | 02, 03, 04 |
| **02 Backend datos** | Esquema Supabase + RLS + `servicio-cuentas` (auth + sesión + entitlements) | 01 | 03 (base del servicio), 04 (contrato HTTP), 06 |
| **03 Pagos Polar** | Checkout + webhook receiver + sync a Supabase + reconciliación | 01, 02 | 04 (URL de checkout), 05 (punto de entrada), 06 |
| **04 Backend app** | `features/auth/` + gating + tools MCP | 02 (contrato HTTP), 03 (endpoint checkout) | 05 (contrato de sesión), 06 |
| **05 Frontend app** | Vistas registro/login/perfil/plan/upgrade | 04 (slice de sesión), 03 (checkout) | 06 |
| **06 QA** | Flujos e2e | todos | orquestador (reporte) |

### Contratos concretos (artefacto que pasa de un agente al siguiente)

1. **01 → 02/03/04:** `01-hallazgos.md`. Incluye el **borrador** del esquema
   (nombres de tabla y columnas clave) y el **borrador** del contrato HTTP.
2. **02 → 04:** `02-contrato-http.md` — congelado. Rutas exactas, JSON de
   request/response, códigos de error con `errorKey`. Es lo único contra lo que
   el agente 04 escribe; no lee el código del servicio.
3. **02 → 03:** el repo/carpeta de `servicio-cuentas` con su estructura base
   (`index.js`/`runtime.js`/`transport.js`/`handlers/`) ya montada, para que 03
   agregue `handlers/checkout.js` y `handlers/webhook-polar.js` sin rediseñar.
4. **03 → 04:** una línea en `02-contrato-http.md` (o `03-contrato-checkout.md`):
   `POST /api/checkout {plan:'pro'} → 200 {url}`.
5. **03 → 05:** el mismo endpoint de checkout + qué querystring de retorno usa
   Polar al volver (`?checkout_id=…`) para que la UI muestre "procesando".
6. **04 → 05:** `04-contrato-sesion.md` — forma del objeto de sesión
   (`{ user:{id,email,nombre}, plan:'free'|'pro', entitlements:[…], expiresAt }`),
   nombre del evento WS (`auth-updated`), y qué endpoints `/api/auth/*` de la app
   (no del servicio) puede llamar el frontend.
7. **cualquiera → 06:** cada agente deja sus criterios de "hecho" en su propio
   doc; el agente 06 los toma como base de sus casos de prueba.

---

## Puntos de sincronización y validación (gates)

Ningún agente cruza un gate hasta que la condición se cumple y queda registrada
en `HANDOFF.md`.

| Gate | Condición | Frena a | Por qué |
|---|---|---|---|
| **A — Esquema estable** | Migraciones de `02` aplicadas al Supabase del VPS; `list_migrations` (MCP) las muestra; un round-trip `register → login → get session` devuelve el usuario con `plan:'free'`. El esquema NO se toca más sin un cambio de versión explícito. | 04 (gating), 05 (vistas), 03 (tabla `subscriptions`) | Si el gating o la UI se escriben contra un esquema que todavía se mueve, cada cambio de columna rompe código ya hecho. |
| **B — Contrato HTTP congelado** | `02-contrato-http.md` escrito, revisado por el usuario, y con un ejemplo `curl` real por endpoint que responde lo documentado. | 04 (todo su trabajo) | El agente 04 programa contra el contrato, no contra el servicio. Un contrato que cambia = retrabajo en la app. |
| **C — Webhook probado** | Evento de prueba de Polar (sandbox) → `POST /api/webhooks/polar` → `subscriptions.status='active'` en Supabase, verificado con `execute_sql` (MCP). Reintento del mismo `event_id` no duplica. | 06 (flujo de upgrade), Fase 6 | QA no puede validar el upgrade si el webhook no cierra el círculo. Desplegar sin esto = pagos que no activan Pro. |
| **D — Contrato de sesión definido** | `04-contrato-sesion.md` escrito; el dominio `features/auth/` responde `bus.on('auth:get')` con la forma documentada (aunque sea con datos mock si el servicio aún no está desplegado). | 05 (todo su trabajo) | El frontend renderiza contra la forma del slice; si cambia después, hay que re-tocar todas las vistas. |

Regla adicional: **el agente 05 (frontend) no toca el sistema de diseño.** Si una
vista necesita un componente que no existe (ej. un stepper), el agente 05
**pregunta al usuario** antes de crearlo, no improvisa un estilo nuevo.

---

## Manejo de errores y rollback a nivel proyecto

### Feature flag maestro

`subscriptionsEnabled` en `config.json` (`features/configuracion/default-config.js`),
default `false`. **Toda** la UI de cuentas, el gating y las llamadas a
`servicio-cuentas` viven detrás de este flag. Con el flag en `false` la app se
comporta **exactamente como hoy**: sin login, todas las features disponibles. Es
el botón de pánico: si algo del sistema de suscripción falla en producción, se
apaga el flag vía `PATCH /api/config` y la app vuelve al estado conocido sin
desinstalar nada ni cortar release.

### Qué pasa si Polar falla a mitad de integración

- El `servicio-cuentas` queda con `/api/auth/*` y `/api/session` operativos →
  **el registro gratis sigue funcionando**. Solo el path de upgrade se deshabilita
  (el botón "Hazte Pro" queda oculto por un sub-flag `checkoutEnabled` o
  simplemente por `subscriptionsEnabled=false`).
- El esquema de Supabase ya soporta `plan:'free'` sin ninguna fila en
  `subscriptions` → ningún usuario queda en estado inconsistente.

### Consistencia de estado de suscripción

- El webhook de Polar es **idempotente por `event_id`** (tabla
  `webhook_events(event_id primary key, processed_at)` en Supabase; si el id ya
  está, se ignora).
- El estado de `subscriptions` siempre es **re-derivable** desde la API de Polar:
  el job de reconciliación (cron en `servicio-cuentas`) recorre las suscripciones
  activas conocidas y corrige divergencias. Si Supabase queda desincronizado por
  un webhook perdido, el cron lo arregla en la próxima corrida.
- La app **nunca** decide el estado de plan por su cuenta: siempre lo lee de
  `/api/session`. Si el servicio no responde, `features/auth/` usa el último
  estado cacheado en `auth-session.json` con un TTL corto y, pasado el TTL, cae a
  `plan:'free'` (fail-safe: nunca desbloquea Pro sin confirmación del servidor;
  como mucho bloquea de más y el usuario reintenta).

### Aislamiento del dominio

`features/auth/` se monta vía `core/register-domain.js`, que envuelve cada
`register()` en su propio try/catch. Si el dominio falla al arrancar (servicio
caído, config corrupta), loguea `core.dominio.fallo_montaje` y **el resto de la
app sigue funcionando** — sin cuentas, como hoy.

### Migraciones Supabase

Cada migración se numera y trae su `down`. El esquema no se modifica in-place
después del Gate A: un cambio = migración nueva + bump de versión del contrato +
nota en `HANDOFF.md`.

### Rollback por fase

| Si falla en… | Rollback |
|---|---|
| Fase 1 (datos) | Correr los `down` de las migraciones; `servicio-cuentas` no desplegado todavía, cero impacto en usuarios. |
| Fase 2 (pagos) | `checkoutEnabled=false`; registro gratis intacto. Producto en Polar se archiva. |
| Fase 3 (backend app) | La rama de `features/auth/` no se mergea; `subscriptionsEnabled` nunca llega a `true` en un build publicado. |
| Fase 4 (frontend) | Igual que Fase 3 — el trabajo vive en rama hasta que QA pasa. |
| Fase 6 (despliegue) | Apagar `subscriptionsEnabled` remoto; `docker compose down` del `servicio-cuentas` en Coolify; DNS del subdominio se deja apuntando (sin tráfico). |

---

## Cómo se ejecuta el set

1. El orquestador lee este doc y `HANDOFF.md`.
2. Ejecuta el agente 01 (`01-agente-investigacion.md`). Al terminar, actualiza la
   fila de estado y los gates afectados en `HANDOFF.md`, y **pausa para revisión
   del usuario** de `01-hallazgos.md`.
3. Ejecuta el agente 02. Al pasar Gate A y Gate B, lo registra en `HANDOFF.md`.
4. Lanza 03 y 04 (pueden ir en paralelo tras Gate B). Cada uno actualiza
   `HANDOFF.md` al cerrar sus criterios de "hecho".
5. Al pasar Gate C y Gate D, ejecuta 05.
6. Ejecuta 06. Si algún flujo falla, el orquestador re-despacha al agente dueño de
   esa pieza con el reporte de QA como contexto acotado (no re-ejecuta todo).
7. Fase 6 despliegue.
8. **Al finalizar todo el set: `/ponytail-review`** sobre el código producido por
   las fases 1–4.

Cada agente, al arrancar, lee: este doc (secciones "Nomenclatura congelada",
"Puntos de sincronización" y su fila del "Mapa"), su propio `NN-agente-*.md`, y
los artefactos listados en su `## Contrato de entrada`. Nada más — el resto es
ruido para su contexto.
