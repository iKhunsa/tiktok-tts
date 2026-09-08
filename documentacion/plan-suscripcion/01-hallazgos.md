# 01 — Hallazgos de investigación (Fase 0)

Producido por el **Agente 01**. Los agentes 02–05 lo leen como punto de partida.
**El set queda en pausa para revisión del usuario tras este documento** (ver
`## 7. Riesgos abiertos` — hay 3 decisiones que necesitan tu confirmación antes de
arrancar la Fase 1).

---

## Resumen ejecutivo — qué cambió respecto al plan

El plan (`00-ORQUESTADOR.md`) asumía que los agentes DEV usarían el **MCP de
Supabase** para correr migraciones y el **MCP de Polar** para checkout/webhooks.
El sondeo muestra que **ninguna de las dos cosas aplica**:

1. El MCP de Supabase conectado apunta a **Supabase Cloud**, no a la instancia
   self-hosted del VPS. Ve un solo proyecto (`LuisLeonPardo's Project`,
   `yiotnouuhlkkzzhaggpz`) que además está **INACTIVE** y no es el de este
   proyecto. **No sirve para tocar la base real.**
2. **No hay MCP de Polar conectado.** La integración con Polar (crear producto,
   checkout, webhooks) va **100% por su API REST** (`https://api.polar.sh/v1`),
   igual en DEV que en runtime.

La buena noticia: **el VPS entero se maneja por el MCP de Coolify** (que sí está
conectado), y ahí está todo — incluida la Supabase self-hosted y el
`telemetria-tts` que sirve de patrón. El plan sigue en pie; cambia el *cómo* de
las migraciones y de la creación del producto en Polar, no la arquitectura.

---

## 1. MCP de Supabase

| Dato | Valor |
|---|---|
| Servidor MCP | Supabase **Cloud** management API (no self-hosted) |
| Proyectos visibles | 1 — `LuisLeonPardo's Project` (`yiotnouuhlkkzzhaggpz`), región `us-west-2` |
| Estado | `INACTIVE` |
| Postgres | 17.6 (engine 17) |
| Organización | `hpcwsklllnlxbcoszpgk` |

**Conclusión:** este MCP **no puede** aplicar migraciones ni `execute_sql` contra
la Supabase self-hosted del VPS. Sirve, como mucho, para consultar la doc
(`search_docs`).

### La Supabase real (self-hosted) está en Coolify

| Dato | Valor |
|---|---|
| Dónde | Coolify · proyecto `supabase` · servicio `supabase` (`0d1y5zwwvajsdrzyride0awa`) |
| Servidor | `localhost` / `host.docker.internal` (el VPS), `is_reachable: true` |
| Estado | `running:healthy` |
| Coolify version | 4.3.14 |

Otros servicios en el mismo VPS: `glitchtip`, `aptabase`, `umami`, `twenty`,
`postiz`, `satoshi-scraper`, y **`telemetria-tts`** (app, repo
`TikLiveTTS/telemetria-tts`, branch `main`, dockercompose, dominio
`https://telemetria.tiklivetts.es`).

### Cómo se corren las migraciones entonces

Igual que `telemetria-tts` (ver §4): **archivos `.sql` versionados + un runner
`migrate.js`** que corre al arrancar el servicio, contra el `POSTGRES_URL` de la
Supabase self-hosted. Tabla `schema_migrations(filename pk, applied_at)`, cada
migración atómica (`BEGIN`/`COMMIT`). **No hace falta la CLI de Supabase ni el
MCP.** El `servicio-cuentas` se conecta al Postgres de Supabase con un rol de
acceso completo (como `telemetria-tts` usa su usuario `telemetry`).

**Implicancia para el Agente 02:** la sección de **RLS pierde peso**. RLS solo
importa si la app o el browser hablaran con Supabase directo — la decisión de
arquitectura ya lo descarta (todo pasa por `servicio-cuentas`). Se puede dejar
RLS `ON` con políticas mínimas como defensa en profundidad, pero no es el
mecanismo de control de acceso. El control real es: solo `servicio-cuentas` tiene
la connection string.

---

## 2. Polar.sh — API REST (no hay MCP)

Base: `https://api.polar.sh/v1` · Auth: `Authorization: Bearer polar_pat_…` (o
Organization Access Token). SDKs oficiales JS/Python, pero con `undici` directo
alcanza.

### Crear el producto "Pro anual"

No hay MCP → se crea desde el **dashboard de Polar** (o `POST /v1/products`). Se
copia el `product_id` (menú de contexto del producto → "Copy Product ID"). El
Agente 03 lo hace y lo guarda en `plans.polar_product_id`.

### Checkout — `POST /v1/checkouts`

```
POST https://api.polar.sh/v1/checkouts
Authorization: Bearer polar_pat_...
{
  "products": ["<product_id>"],
  "customer_email": "<email del usuario>",
  "external_customer_id": "<user.id de nuestra DB>",
  "success_url": "https://<subdominio>/checkout/ok?checkout_id={CHECKOUT_ID}",
  "metadata": { "user_id": "<user.id>" }
}
→ 200 { "id", "url", "client_secret", "status": "open", ... }
```

- **`external_customer_id`** es la pieza clave para reconciliación: Polar lo
  devuelve como `customer.external_id` en todos los webhooks → mapeo directo a
  nuestro `users.id` sin tabla de correspondencia.
- `success_url` acepta el placeholder `{CHECKOUT_ID}`.
- La página de checkout admite `?theme=dark|light`.
- Objeto checkout: `status ∈ {open, confirmed, expired, failed}`,
  `subscription_id` / `order_id` se rellenan tras confirmar.

### Webhooks

- Se configuran en **Polar → Organization Settings → Webhooks → Add Endpoint**.
  URL absoluta y alcanzable: `https://<subdominio>/api/webhooks/polar`.
- Firma: estándar **`standardwebhooks`**. El secreto que da Polar
  (`polar_whs_…`) hay que **base64-encodearlo entero** antes de pasarlo al
  verificador (`new Webhook(Buffer.from(secret.trim()).toString('base64'))`).
  **Requiere el raw body** — parser `express.raw()` en esa ruta, no `express.json()`.
- Firma inválida → responder `403`, no procesar.

### Eventos de suscripción relevantes

| Evento | Cuándo | Acción en `subscriptions` |
|---|---|---|
| `subscription.created` | nueva suscripción | upsert, `status` según payload |
| `subscription.active` | suscripción activa y pagada | `status='active'`, set `current_period_end` |
| `subscription.updated` | **catch-all** de todos los cambios de estado | re-leer `status` + `cancel_at_period_end` + `current_period_end` del payload y reflejar |
| `subscription.canceled` | cancelada (sigue activa hasta fin de período) | `status='canceled'`, NO tocar `current_period_end` |
| `subscription.past_due` | falló el cobro de renovación | `status='past_due'` |
| `subscription.revoked` | acceso cortado ya | `status='revoked'` → plan efectivo `free` |
| `subscription.cycled` | entró nuevo período de facturación | actualizar `current_period_start/end` |
| `subscription.paused` / `resumed` | pausa/reanudación | `status` correspondiente |

**Recomendación:** suscribirse a **`subscription.updated`** como fuente principal
(es catch-all y trae el estado completo) + `subscription.active` y
`subscription.revoked` para los bordes. El payload de suscripción trae todo lo
que necesitamos: `status`, `current_period_start`, `current_period_end`,
`cancel_at_period_end`, `canceled_at`, `ends_at`, `customer.external_id`,
`product_id`, `amount`, `currency`, `recurring_interval`.

También existe **`customer.state_changed`** — un solo evento con el estado de
entitlements completo del cliente. Es la integración más simple que recomienda
Polar (un evento, estado actual, sin reconstruir de deltas). **Alternativa a
evaluar por el Agente 03**: usar solo ese evento en vez del set de
`subscription.*`.

### Cancelación (comportamiento)

Cancelación end-of-period (default): al cancelar llegan `subscription.updated` +
`subscription.canceled` **inmediatamente**, con `status` todavía `active` y
`cancel_at_period_end: true`. Al llegar el fin de período: otro
`subscription.updated` + (según config) `subscription.revoked`. → El usuario ve
Pro hasta `current_period_end`, después `free`. El plan ya lo contempla.

### Sandbox / pruebas

Polar tiene entorno de pruebas (modo test / tarjetas de prueba tipo Stripe). El
switch producción/test es por credenciales (`POLAR_ENV`). Para dev local: **Polar
CLI** hace tunneling de webhooks a `localhost`. El Agente 06 documenta el
procedimiento exacto de pago de prueba.

---

## 3. Decisión: webhook receiver

**Confirmado el modelo del plan:** la app de escritorio no puede recibir
webhooks. El `servicio-cuentas` en el VPS es el receptor.

- **Subdominio propuesto:** `cuentas.tiklivetts.es` (paralelo a
  `telemetria.tiklivetts.es`). Se crea vía Coolify (Caddy) + DNS de Hostinger en
  la Fase 6.
- **Polling descartado:** Polar recomienda webhooks; el polling obligaría a
  `servicio-cuentas` a recorrer la API de Polar constantemente. El job de
  reconciliación (cada 6 h) ya cubre el caso de webhook perdido.

---

## 4. Decisión: repo de `servicio-cuentas` → **repo hermano nuevo**

`telemetria-tts` **corre su propio Postgres** (`postgres:16-alpine`, db
`telemetry`) — NO usa Supabase. Si `servicio-cuentas` fuera una carpeta ahí,
mezclaría dos servicios con bases y ciclos de release distintos.

**Decisión:** repo nuevo `TikLiveTTS/servicio-cuentas`, **mismo patrón** que
`telemetria-tts/api/`, desplegado como app Coolify hermana. Diferencia: en vez de
levantar su propio Postgres, se conecta al Postgres de la **Supabase
self-hosted** vía `POSTGRES_URL` (ambos contenedores en el mismo VPS / red
Docker de Coolify).

### Patrón `telemetria-tts` a replicar (verificado leyendo el repo)

```
servicio-cuentas/
  api/
    Dockerfile
    package.json                 (express, pg, bcryptjs, helmet, cookie-parser, undici, standardwebhooks)
    db/
      migrate.js                 ← runner idempotente: schema_migrations(filename pk), cada .sql atómico
      migrations/
        001_init.sql
        002_....sql
    src/
      index.js                   ← express app, helmet CSP, orden: health → public → auth → protegido
      config.js                  ← required()/bool()/int() sobre process.env, falla rápido si falta algo
      db.js                      ← new Pool({connectionString: config.postgresUrl}), waitForDb(30, 2000ms)
      auth.js                    ← bcryptjs para password, token HMAC sign()/verify() (o Bearer, ver §7)
      jobs.js                    ← setInterval in-proceso (NO cron externo), .unref(), primer pase al arrancar
      middleware/
        requireAuth.js           ← 401 si no hay sesión, setea req.session
        rateLimit.js             ← makeRateLimit({max, windowMs}) — login 5/15min
        validate.js
      routes/
        health.js  auth.js  session.js  entitlements.js  account.js  checkout.js  webhook-polar.js
      polar/
        cliente.js  crear-checkout.js  verificar-firma.js
      db/ (queries)
        crear-usuario.js  buscar-usuario-por-email.js  estado-cuenta.js  ...
  docker-compose.yml             ← service `api` (+ caddy); SIN postgres propio, POSTGRES_URL → Supabase
  Dockerfile.caddy + Caddyfile
  .env.example
  HANDOFF.md
```

Detalles del patrón que importan:
- **`config.js`** valida env al arrancar y `process.exit(1)` si falta algo. Cero
  defaults peligrosos. `SESSION_SECRET` mínimo 16 chars.
- **`auth.js` de telemetria** es single-admin (user del `.env`). `servicio-cuentas`
  necesita `users` real: `bcryptjs.hash` por usuario, y el token HMAC lleva
  `{ uid, exp }` en vez de `{ u, exp }`.
- **`jobs.js`**: `setInterval` in-proceso con `.unref()`, primer pase al arrancar
  con ventana amplia "por si el servicio estuvo caído". Así va el job de
  reconciliación — sin `pg_cron`, sin contenedor extra.
- **Migraciones** = SQL plano. Los `down` se documentan en un comentario dentro
  del `.sql` o en un `migrations/rollback/NNN.sql` (telemetria no tiene down
  explícito — el Agente 02 lo agrega, el plan lo pide).
- **Deploy**: imagen a `ghcr.io/tiklivetts/servicio-cuentas-api:latest` vía
  `.github/workflows/build-api.yml`, Coolify hace `pull_policy: always`.
- **Caddy** hace TLS del subdominio.

---

## 5. Borrador de esquema de datos

Contra el Postgres de la Supabase self-hosted. Schema `public` (o `cuentas` para
aislar del resto de Supabase — decide el Agente 02).

```sql
-- 001_init.sql

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nombre        text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id                    text PRIMARY KEY,          -- 'free' | 'pro'
  nombre                text NOT NULL,
  precio_anual_centavos integer NOT NULL DEFAULT 0,
  polar_product_id      text
);

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id               text NOT NULL REFERENCES plans(id),
  status                text NOT NULL,             -- active|canceled|past_due|revoked|paused
  polar_subscription_id text UNIQUE,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  current_period_end    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions (user_id);
CREATE INDEX ON subscriptions (status);

CREATE TABLE entitlements (
  feature_id text NOT NULL,
  plan_id    text NOT NULL REFERENCES plans(id),
  PRIMARY KEY (feature_id, plan_id)
);

CREATE TABLE sessions (
  token      text PRIMARY KEY,       -- si se elige token opaco (ver §7)
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX ON sessions (user_id);

CREATE TABLE webhook_events (
  event_id     text PRIMARY KEY,
  source       text NOT NULL DEFAULT 'polar',
  processed_at timestamptz NOT NULL DEFAULT now()
);
```

**Plan efectivo de un usuario** (lo implementa `db/estado-cuenta.js`):

```
plan = 'pro'  si existe subscription del user con
                status IN ('active','canceled') AND current_period_end > now()
       'free' en cualquier otro caso
entitlements = SELECT feature_id FROM entitlements WHERE plan_id = <plan efectivo>
```

`gen_random_uuid()` y `citext` requieren extensiones — el Agente 02 verifica que
estén (`pgcrypto`/`citext`; en Supabase suelen venir).

---

## 6. Borrador de contrato HTTP (`servicio-cuentas`)

El Agente 02 lo congela en `02-contrato-http.md`. Todos los errores:
`{ error: '<texto>', errorKey: 'errors.<clave>' }`.

| Método | Path | Auth | Request | Response 2xx |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ email, password, nombre }` | `201 { token, user, plan:'free', entitlements:[], expiresAt }` |
| POST | `/api/auth/login` | — | `{ email, password }` | `200 { token, user, plan, entitlements, expiresAt }` |
| POST | `/api/auth/logout` | Bearer | — | `200 { ok:true }` |
| GET | `/api/session` | Bearer | — | `200 { user:{id,email,nombre}, plan, entitlements, expiresAt }` |
| GET | `/api/entitlements` | Bearer | — | `200 { entitlements:[featureId] }` |
| PATCH | `/api/account` | Bearer | `{ nombre }` | `200 { user }` |
| POST | `/api/checkout` | Bearer | `{ plan:'pro' }` | `200 { url }` |
| POST | `/api/webhooks/polar` | firma | raw body | `200 { received:true }` / `403` |
| GET | `/api/health` | — | — | `200 { ok:true }` |

Errores previstos: `400 errors.invalidBody`, `401 errors.unauthorized`,
`401 errors.invalidCredentials`, `409 errors.emailTaken`,
`403 errors.invalidSignature`, `502 errors.polarUnavailable`,
`503 errors.notReady`.

---

## 7. Riesgos abiertos — necesitan decisión del usuario

### ⚠️ A. Supabase self-hosted vs Supabase Cloud

El MCP conectado es de **Cloud** y no sirve para el VPS. Dos caminos:

1. **Seguir con la self-hosted del VPS** (lo que dice tu prompt). Migraciones por
   `migrate.js` + SQL, `servicio-cuentas` se conecta al Postgres de Supabase por
   connection string interna. El MCP de Supabase no se usa. **Recomendado** — es
   coherente con `telemetria-tts` y no agrega costo cloud.
2. **Mover a Supabase Cloud.** El MCP pasa a servir para todo (migraciones,
   `execute_sql`, advisors, tipos TS). Pero: hay que activar/crear un proyecto,
   entra costo mensual, y queda desalineado con el resto de tu infra self-hosted.

**Pregunta:** ¿confirmás el camino 1 (self-hosted)?

### ⚠️ B. Mecanismo de sesión: token opaco vs JWT/HMAC

`telemetria-tts` usa cookie HMAC. Para la app Electron (llamadas `undici`):

1. **Token opaco** en tabla `sessions` — revocable al instante (logout, cambio de
   plan), un query por request. **Recomendado** (volumen bajo, la revocación
   importa).
2. **Token HMAC firmado** (como telemetria) — sin query, pero revocar es difícil;
   habría que esperar a que expire.

**Pregunta:** ¿token opaco?

### ⚠️ C. Alcance del producto en Polar

¿La suscripción "Pro" es **solo anual** (como dice el prompt) o querés también
mensual desde el día 1? Afecta cuántos productos/precios crea el Agente 03 y la
UI del Agente 05.

**Pregunta:** ¿solo anual al inicio?

### ⚠️ D. (menor) `customer.state_changed` vs `subscription.*`

El Agente 03 puede simplificar el webhook usando solo `customer.state_changed`
(un evento, estado completo) en vez del set `subscription.*`. Lo dejo a criterio
del Agente 03 salvo que tengas preferencia.

---

## 8. Qué NO se tocó

Solo sondeo de lectura. No se creó ninguna tabla, ningún producto de Polar,
ningún recurso de Coolify, ninguna entrada de DNS. El repo `servicio-cuentas` no
existe todavía.
