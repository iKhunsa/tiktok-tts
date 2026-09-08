# Agente 02 — Backend de datos (Supabase / VPS)

## Objetivo

Diseñar e implementar el esquema de usuarios, planes, suscripciones y estado de
cuenta en el Supabase self-hosted del VPS (tablas + RLS + relación usuario ↔ plan
activo), y construir el `servicio-cuentas`: el servicio server-side (patrón
`telemetria-tts`, "un JS por función") que la app llama por REST para registrar
usuarios, autenticarlos y consultar su estado y sus desbloqueos. Congela el
contrato HTTP en `02-contrato-http.md` — es lo único contra lo que programa el
agente 04.

## Dependencias explícitas

- **`01-hallazgos.md`** (agente 01) escrito y revisado por el usuario. En
  particular: si Supabase Auth está disponible o hay que modelar `users` a mano,
  cómo se versionan las migraciones self-hosted, y el borrador de esquema +
  contrato HTTP.
- Repo/carpeta de `servicio-cuentas` decidido en `01-hallazgos.md`.

## Contrato de entrada

| Artefacto | De quién | Uso |
|---|---|---|
| `01-hallazgos.md` §5 (borrador esquema), §6 (borrador contrato), §1 (límites Supabase), §4 (repo) | agente 01 | Base del DDL y del contrato; se refina, no se reinventa. |
| `00-ORQUESTADOR.md` — Nomenclatura congelada | orquestador | `servicio-cuentas`, `entitlements`, plan `pro`/`free`, subdominio. |
| MCP Supabase | sesión | `apply_migration`, `execute_sql`, `list_migrations`, `get_advisors`, `generate_typescript_types`. |
| Patrón `telemetria-tts` | repo externo | Estructura `index.js`/`runtime.js`/`transport.js`/`handlers/`, Dockerfile, carga de secrets por env. |

## Contrato de salida

1. **Migraciones versionadas** aplicadas al Supabase del VPS: `users`, `plans`,
   `subscriptions`, `entitlements`, `webhook_events`. Cada migración con su `down`.
2. **`servicio-cuentas`** desplegable (localmente y en Coolify) con estos
   endpoints funcionando contra Supabase:
   - `POST /api/auth/register` — email + password + nombre → crea usuario `plan:'free'`.
   - `POST /api/auth/login` — email + password → token de sesión.
   - `POST /api/auth/logout` — invalida el token.
   - `GET  /api/session` — token → `{ user, plan, entitlements, expiresAt }`.
   - `GET  /api/entitlements` — token → lista de `featureId` desbloqueados.
   - `PATCH /api/account` — token → editar nombre/email (no password aquí, ver riesgos).
   - `GET  /api/health` — sin auth, para el watchdog de Coolify.
   - *(placeholders vacíos)* `POST /api/checkout` y `POST /api/webhooks/polar` —
     el agente 03 los implementa; 02 solo deja el archivo y la ruta registrada
     devolviendo `501`.
3. **`documentacion/plan-suscripcion/02-contrato-http.md`** — el contrato
   congelado: por cada ruta, método, path, headers, JSON de request, JSON de
   response 2xx, y tabla de errores `{ status, error, errorKey }`. Un ejemplo
   `curl` real por endpoint.
4. **`servicio-cuentas` con la base lista para el agente 03**: estructura de
   carpetas montada, `handlers/checkout.js` y `handlers/webhook-polar.js` creados
   como stubs con el TODO marcado.

## Tareas

- [ ] **1.** Leer `01-hallazgos.md` completo + la Nomenclatura congelada de
  `00-ORQUESTADOR.md`. Confirmar: ¿Supabase Auth sí/no? ¿repo de `servicio-cuentas`
  dónde? Si algo de §5/§6 no cierra, **preguntar al usuario** antes de escribir DDL.
- [ ] **2.** Delegar en el **auxiliar de patrón `telemetria-tts`** para traer el
  esqueleto exacto (nombres de archivo, cómo arranca el server, cómo lee env,
  Dockerfile, healthcheck). Ver Delegación.
- [ ] **3.** Escribir la migración `0001_esquema_base`:
  - `users(id uuid pk, email citext unique, password_hash text, nombre text, created_at, updated_at)` — o mapear a `auth.users` si §1 dice que Supabase Auth está.
  - `plans(id text pk /* 'free','pro' */, nombre text, precio_anual_centavos int, polar_product_id text null)`.
  - `subscriptions(id uuid pk, user_id fk→users, plan_id fk→plans, status text /* active|canceled|past_due|revoked */, polar_subscription_id text unique, current_period_end timestamptz, created_at, updated_at)`.
  - `entitlements(id uuid pk, feature_id text, plan_id fk→plans, UNIQUE(feature_id, plan_id))` — qué feature desbloquea qué plan; se seedea con la lista de features Pro que define el agente 04.
  - `webhook_events(event_id text pk, source text, processed_at timestamptz)` — idempotencia de webhooks.
  - Índices: `subscriptions(user_id)`, `subscriptions(status)`, `subscriptions(polar_subscription_id)`.
- [ ] **4.** Escribir la migración `0002_rls`:
  - RLS ON en `users`, `subscriptions`. Política: un usuario solo lee su propia
    fila. `plans` y `entitlements` son de lectura pública (catálogo). `servicio-cuentas`
    usa la **service role key** (bypass RLS) para todas sus escrituras.
  - `webhook_events` sin acceso público (solo service role).
- [ ] **5.** Aplicar las migraciones con `apply_migration` (MCP). Verificar con
  `list_migrations` y `list_tables`. Correr `get_advisors {type:'security'}` y
  resolver lo que marque (RLS faltante, funciones `security definer`, etc.).
- [ ] **6.** Seed inicial: fila `plans('free', …)` y `plans('pro', precio, polar_product_id NULL)`
  (el `polar_product_id` lo completa el agente 03). Seed de `entitlements` con un
  placeholder — la lista real la trae el agente 04, dejar un `TODO` visible.
- [ ] **7.** Montar `servicio-cuentas` con el esqueleto del patrón `telemetria-tts`:
  - `index.js` — arranque HTTP, registro de rutas, healthcheck.
  - `runtime.js` — ciclo de vida, lee env (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
    `PORT`, más tarde claves Polar), cliente Supabase.
  - `db/*.js` — un archivo por operación: `crear-usuario.js`, `buscar-usuario-por-email.js`,
    `crear-sesion.js`, `validar-sesion.js`, `invalidar-sesion.js`, `estado-cuenta.js`,
    `entitlements-de-usuario.js`.
  - `handlers/*.js` — un archivo por endpoint: `register.js`, `login.js`, `logout.js`,
    `session.js`, `entitlements.js`, `account.js`, `health.js`, `checkout.js` (stub 501),
    `webhook-polar.js` (stub 501).
  - `auth/*.js` — `hash-password.js`, `verificar-password.js`, `generar-token.js`
    (token opaco aleatorio guardado en tabla `sessions`, o JWT firmado — decidir en
    tarea 8), `middleware-token.js`.
- [ ] **8.** Decidir el mecanismo de sesión: **token opaco** en una tabla
  `sessions(token pk, user_id, expires_at)` (simple, revocable, un query por
  request) vs **JWT** firmado (sin query, pero revocación complicada). Recomendado:
  token opaco — el volumen es bajo y la revocación en logout/cambio de plan
  importa. Si se elige token opaco, agregar `sessions` a la migración `0001`.
- [ ] **9.** Implementar los 6 handlers reales (register, login, logout, session,
  entitlements, account) usando los `db/*.js`. Estructura de error uniforme:
  `res.status(N).json({ error: '<texto>', errorKey: 'errors.<clave>' })` — mismo
  patrón que el backend de la app, para que el frontend traduzca con `tErr()`.
- [ ] **10.** Registrar `checkout.js` y `webhook-polar.js` como rutas que
  devuelven `501 { error:'No implementado', errorKey:'errors.notImplemented' }`,
  con un comentario `// TODO(agente-03): …`.
- [ ] **11.** Escribir `02-contrato-http.md`: por cada endpoint, método/path,
  headers (`Authorization: Bearer <token>` donde aplique), request JSON, response
  2xx JSON, tabla de errores, y un `curl` de ejemplo que funcione contra la
  instancia local.
- [ ] **12.** Levantar `servicio-cuentas` local apuntando al Supabase del VPS y
  correr el round-trip: `register → login → session (plan:'free') → account (editar
  nombre) → session (nombre nuevo) → logout → session (401)`. Guardar la
  transcripción en `02-contrato-http.md` como anexo "Round-trip verificado".
- [ ] **13.** Actualizar `HANDOFF.md`: agente 02 a "hecho", marcar **Gate A**
  (esquema estable) y **Gate B** (contrato congelado) como cumplidos con fecha.
  Notificar que 03 y 04 pueden arrancar.

## Criterios de "hecho"

1. `list_migrations` (MCP) muestra `0001_esquema_base` y `0002_rls` aplicadas; `list_tables` muestra las 5 (o 6 con `sessions`) tablas.
2. `get_advisors {type:'security'}` no devuelve findings de severidad alta sin justificar en `02-contrato-http.md`.
3. `curl -X POST .../api/auth/register` con un email nuevo devuelve `201` y una fila aparece en `users` (verificado con `execute_sql`).
4. `curl .../api/session` con el token del login devuelve `{ user, plan:'free', entitlements:[], expiresAt }` con la forma exacta documentada.
5. `curl .../api/session` sin token o con token inválido devuelve `401 { error, errorKey:'errors.unauthorized' }`.
6. `curl .../api/health` devuelve `200` sin auth.
7. `02-contrato-http.md` tiene las 8 rutas con los 5 campos (método, path, request, response, errores) y el anexo de round-trip.
8. `servicio-cuentas` arranca con `npm start` leyendo solo env vars; ningún secret hardcodeado (grep `SUPABASE_SERVICE_KEY` da solo `process.env`).
9. Los stubs `checkout` y `webhook-polar` devuelven `501` y tienen el `TODO(agente-03)`.
10. `HANDOFF.md` marca Gate A y Gate B.

## Delegación

| Tarea concreta a delegar | A qué subagente | Info mínima que le paso | Qué espero de vuelta |
|---|---|---|---|
| Extraer el esqueleto exacto del patrón modular de `telemetria-tts` (tarea 2) | **auxiliar de patrón `telemetria-tts`** (Explore, read-only) | Ruta/URL del repo; "reportá: nombres y rol de cada archivo top-level, cómo arranca el HTTP server, cómo lee env/secrets, contenido del Dockerfile y del healthcheck, cómo se estructura `connectors/` o `handlers/`". | Un esqueleto de carpetas + 1 archivo de ejemplo por rol (index/runtime/transport/handler), ≤ 60 líneas. |
| Revisar el DDL antes de aplicarlo (tarea 3–4) | **auxiliar de revisión de esquema** (nuevo, read-only) | El DDL completo de `0001` y `0002` + el borrador de §5 de `01-hallazgos.md`. "Buscá: FKs faltantes, columnas sin índice que se van a filtrar, tipos flojos (text donde debería ser enum/check), y si la RLS deja algún hueco." | Lista de correcciones concretas; nada más. |
| Generar los tipos TypeScript del esquema para anexar al contrato | `generate_typescript_types` (MCP Supabase, tool directa) | — | El archivo de tipos; se pega en `02-contrato-http.md` como referencia. |
| Probar el round-trip HTTP end-to-end (tarea 12) | **nadie** — lo corre el propio agente 02 con `curl`, es barato y necesita el token en contexto | — | — |

Motivo de acotar: el patrón de `telemetria-tts` y la revisión de DDL son lecturas
grandes; delegando, el agente 02 trabaja con la síntesis y mantiene su contexto
enfocado en el DDL y los handlers.

## Riesgos y rollback

- **Cambio de esquema después del Gate A** — prohibido in-place. Si el agente 03 o
  04 descubren que falta una columna, es migración nueva (`0003_…`) + bump de
  versión en `02-contrato-http.md` + nota en `HANDOFF.md`. Nunca editar `0001`.
- **`PATCH /api/account` con cambio de email** — un email es identidad de login;
  cambiarlo sin re-verificación es un vector de secuestro de cuenta. Decisión:
  `PATCH /api/account` solo edita `nombre` en esta fase; cambio de email/password
  es un flujo aparte (fuera de alcance, anotar como pendiente).
- **Password hashing** — usar `bcrypt`/`argon2` en `servicio-cuentas`, nunca un
  hash casero. Si §1 dice que Supabase Auth está disponible, preferirlo y saltear
  todo el manejo de password propio.
- **Service role key** — es full-access a la DB. Vive solo como env del contenedor
  en Coolify (Fase 6), nunca en el repo, nunca en un `.env` commiteado, nunca
  llega a la app de escritorio.
- Rollback: correr los `down` de `0002` y `0001` en orden inverso; `servicio-cuentas`
  aún no desplegado en producción, sin impacto en usuarios.
